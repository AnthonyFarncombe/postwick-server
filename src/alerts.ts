import { storeEvents, Variable } from "./store";
import { sendMail } from "./email";
import VariableLog from "./models/variableLog";
import { VisitType } from "./models/visit";
import User from "./models/user";

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
    if (!variable.value) return;

    const match = /^([a-z]+)AlarmTriggered$/.exec(variable.name);
    if (!match) return;

    const users = await User.find({ notifications: "alarm" });
    if (!users) return;

    sendMail({
      to: users.map(u => ({ name: `${u.firstName} ${u.lastName}`, address: u.email })),
      template: "alarm",
      subject: match[1][0].toUpperCase() + match[1].slice(1) + " Alarm Triggered - Postwick",
      context: { type: match[1] },
    });
  } catch (err) {
    console.error(err);
  }
}

async function waterAlerts(variable: Variable): Promise<void> {
  try {
    if (variable.value || !/^moistureSensor/.test(variable.name)) return;

    const users = await User.find({ notifications: "water" });
    if (!users) return;

    sendMail({
      to: users.map(u => ({ name: `${u.firstName} ${u.lastName}`, address: u.email })),
      template: "water",
      subject: "Postwick - Moisture Sensor Triggered!",
      context: { location: variable.text?.toLowerCase() },
    });
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
    const users = await User.find({ notifications: "anpr" });
    users.forEach(u => {
      sendMail({
        to: { address: u.email, name: `${u.firstName} ${u.lastName}` },
        template: "anpr-success",
        subject: "Postwick ANPR Notification",
        context: visit,
      });
    });
  } catch (err) {}
});
