import path from "path";
import { storeEvents, Variable } from "./store";
import { sendMail } from "./email";
import Car from "./models/car";
import VariableLog from "./models/variableLog";
import Visit, { VisitType } from "./models/visit";
import User from "./models/user";
import Mail from "nodemailer/lib/mailer";
import { sendSMS } from "./aws";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

let varsToLog: string[] = [];
let enableLogging = false;

storeEvents.on("variablesLoaded", (variables: Variable[]) => {
  varsToLog = variables.filter(v => v.log).map(v => v.name);
  setTimeout(() => (enableLogging = true), 5000);
});

async function logEventsToDb(variable: Variable): Promise<void> {
  try {
    if (varsToLog.includes(variable.name)) {
      const variableLog = new VariableLog({ timestamp: new Date(), name: variable.name, value: variable.value });
      await variableLog.save();
    }
  } catch (err) {
    console.error(err);
  }
}

async function alarmAlerts(variable: Variable): Promise<void> {
  try {
    // Alert cleared so no action
    if (!variable.value) return;

    // Check if alarm event
    const match = /^([a-z]+)AlarmTriggered$/.exec(variable.name);
    if (!match) return;

    // Look for a suspect
    let suspect:
      | { timeFromNow: string; imagePath?: string; plateText?: string; driverName?: string; vehicleType?: string }
      | undefined;

    // If it is the security alarm then check if someone has recently arrived
    if (variable.name === "securityAlarmTriggered") {
      // Look for any cars arriving within the last 30 minutes
      const startDate = new Date();
      startDate.setMinutes(startDate.getMinutes() - 30);

      const visit = await Visit.findOne({
        timestamp: { $gt: startDate },
        imageNameOrig: { $exists: true },
      })
        .sort({ timestamp: -1 })
        .exec();

      if (visit) {
        suspect = {
          timeFromNow: dayjs(visit.timestamp).fromNow(true),
          imagePath: visit.imageNameOrig,
          plateText: visit.plateText,
        };

        // Check if the vehicle is known
        if (suspect.plateText) {
          const car = await Car.findOne({ plateText: visit.plateText }).exec();
          if (car) {
            suspect.driverName = car.name;
            suspect.vehicleType = car.vehicleType;
          }
        }
      }
    }

    // Get all users subscribed to alarm notifications
    const users = await User.find({ notifications: "alarm" });
    if (!users) return;

    // Get mobile numbers and email addresses
    const smsUsers = users.filter(u => u.mobile);
    const emailUsers = users.filter(u => u.email);

    // Generate SMS message body
    let message = match[1][0].toUpperCase() + match[1].slice(1) + " Alarm Triggered - Postwick";
    if (suspect && suspect.driverName) {
      message += `, possibly caused by ${suspect.driverName} who arrived ${suspect.timeFromNow} earlier`;
    } else if (suspect && suspect.plateText) {
      message += `, possibly caused by the driver of ${suspect.plateText.substr(0, 4) +
        suspect.plateText.substr(4, 3)} who arrived ${suspect.timeFromNow} earlier`;
    }

    // Send all SMS messages
    smsUsers.forEach(
      async u =>
        await sendSMS({
          phoneNumber: u.mobile,
          message,
        }),
    );

    // Add email attachments
    const attachments: Mail.Attachment[] = [];
    if (suspect && suspect.imagePath && process.env.CCTV_ARCHIVE) {
      attachments.push({
        filename: suspect.imagePath,
        path: path.resolve(process.env.CCTV_ARCHIVE, suspect.imagePath),
      });
    }

    // Send all emails
    if (emailUsers) {
      await sendMail({
        to: emailUsers.map(u => ({ name: `${u.firstName} ${u.lastName}`, address: u.email })),
        template: "alarm",
        subject: match[1][0].toUpperCase() + match[1].slice(1) + " Alarm Triggered - Postwick",
        context: { type: match[1], suspect },
        attachments,
      });
    }
  } catch (err) {
    console.error(err);
  }
}

async function waterAlerts(variable: Variable): Promise<void> {
  try {
    if (variable.value || !/^moistureSensor/.test(variable.name)) return;

    const users = await User.find({ notifications: "water" });
    if (!users) return;

    const smsUsers = users.filter(u => u.mobile);
    const emailUsers = users.filter(u => u.email);

    smsUsers.forEach(
      async u =>
        await sendSMS({
          phoneNumber: u.mobile,
          message: `The ${variable.text?.toLowerCase()} moisture sensor at Postwick has been triggered`,
        }),
    );

    if (emailUsers) {
      await sendMail({
        to: emailUsers.map(u => ({ name: `${u.firstName} ${u.lastName}`, address: u.email })),
        template: "water",
        subject: "Postwick - Moisture Sensor Triggered!",
        context: { location: variable.text?.toLowerCase() },
      });
    }
  } catch (err) {
    console.error(err);
  }
}

storeEvents.on("valueChanged", async (variable: Variable) => {
  if (!enableLogging) return;
  await logEventsToDb(variable);
  await alarmAlerts(variable);
  await waterAlerts(variable);
});

storeEvents.on("anprSuccess", async (visit: VisitType) => {
  try {
    const attachments: Mail.Attachment[] = [];
    if (visit && process.env.CCTV_ARCHIVE) {
      if (visit.imageNameOrig) {
        attachments.push({
          filename: visit.imageNameOrig,
          path: path.resolve(process.env.CCTV_ARCHIVE, visit.imageNameOrig),
        });
      }
      if (visit.imageNameCropped) {
        attachments.push({
          filename: visit.imageNameCropped,
          path: path.resolve(process.env.CCTV_ARCHIVE, visit.imageNameCropped),
        });
      }
    }

    const users = await User.find({ notifications: "anpr" });
    users.forEach(async u => {
      await sendMail({
        to: { address: u.email, name: `${u.firstName} ${u.lastName}` },
        template: "anpr-success",
        subject: "Postwick ANPR Notification - Success",
        context: { plateText: visit.plateText, name: visit.name },
        attachments,
      });
    });
  } catch (err) {
    console.error(err);
  }
});

storeEvents.on("anprError", async ({ err, visit }: { err: unknown; visit: VisitType | undefined }) => {
  try {
    const context = { err: (err && JSON.stringify(err)) || "Error unknown" };
    const users = await User.find({ notifications: "anpr" });

    const attachments: Mail.Attachment[] = [];
    if (visit && process.env.CCTV_ARCHIVE) {
      if (visit.imageNameOrig) {
        attachments.push({
          filename: visit.imageNameOrig,
          path: path.resolve(process.env.CCTV_ARCHIVE, visit.imageNameOrig),
        });
      }
      if (visit.imageNameCropped) {
        attachments.push({
          filename: visit.imageNameCropped,
          path: path.resolve(process.env.CCTV_ARCHIVE, visit.imageNameCropped),
        });
      }
    }

    users.forEach(u => {
      sendMail({
        to: { address: u.email, name: `${u.firstName} ${u.lastName}` },
        template: "anpr-error",
        subject: "Postwick ANPR Notification - Error",
        context,
        attachments,
      });
    });
  } catch (err) {
    console.error(err);
  }
});
