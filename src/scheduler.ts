import dayjs from "dayjs";
import chalk from "chalk";
import store, { Variable } from "./store";
import Schedule from "./models/schedule";

let meetingScheduled: Variable | undefined;
let meetingSize: Variable | undefined;

interface ScheduledMeeting {
  isScheduled: boolean;
  meetingSize: number;
}

export async function isMeetingScheduled(): Promise<ScheduledMeeting> {
  try {
    // Get current day of week
    const dayOfWeek: string = dayjs().format("dddd");

    // Get all schedules for that day
    const schedules = await Schedule.find({ dayOfWeek: dayOfWeek });

    // Exclude any schedules that are non recurring and not for today
    while (true) {
      const index = schedules.findIndex(s => s.frequency === "0" && s.startDate !== dayjs().format("YYYYMMDD"));
      if (index > -1) schedules.splice(index, 1);
      else break;
    }

    // Get reference to current day
    const today = dayjs().startOf("day");

    // Exclude any schedules that do not occur on the current week
    while (true) {
      const index = schedules.findIndex(
        s =>
          parseInt(s.frequency) > 1 &&
          s.startDate &&
          today.diff(s.startDate, "day") % (parseInt(s.frequency) * 7) === 0,
      );
      if (index > -1) schedules.splice(index, 1);
      else break;
    }

    // Check if any schedules exist that override other schedules
    const overridesExist = schedules.filter(s => s.overrideDay).length > 0;
    if (overridesExist) {
      while (true) {
        const index = schedules.findIndex(s => !s.overrideDay);
        if (index > -1) schedules.splice(index, 1);
        else break;
      }
    }

    // Check if the current time falls within one of the schedules
    while (true) {
      const index = schedules.findIndex(s => {
        const timeOfMeeting = dayjs()
          .hour(parseInt(s.timeOfMeeting.substr(0, 2)))
          .minute(parseInt(s.timeOfMeeting.substr(3, 2)))
          .second(0)
          .millisecond(0);
        const minutesFromNow = dayjs().diff(timeOfMeeting, "minute");
        return minutesFromNow < -40 || minutesFromNow > 10;
      });

      if (index > -1) schedules.splice(index, 1);
      else break;
    }

    const schedule = schedules.length > 0 ? schedules[0] : undefined;

    if (schedule) {
      return {
        isScheduled: true,
        meetingSize: schedule.meetingSize,
      };
    } else {
      return {
        isScheduled: false,
        meetingSize: 0,
      };
    }
  } catch (err) {
    console.log(chalk.red(err));
    return {
      isScheduled: false,
      meetingSize: 0,
    };
  }
}

export async function startScheduler(): Promise<void> {
  console.log(chalk.green("Starting scheduler"));

  meetingScheduled = store.variables.find(v => v.name === "meetingScheduled");
  meetingSize = store.variables.find(v => v.name === "meetingSize");

  if (meetingScheduled && meetingSize) {
    const scheduledMeeting = await isMeetingScheduled();
    meetingScheduled.value = scheduledMeeting.isScheduled;
    meetingSize.value = scheduledMeeting.isScheduled ? scheduledMeeting.meetingSize : 0;

    setInterval(async () => {
      if (meetingScheduled && meetingSize) {
        const scheduledMeeting = await isMeetingScheduled();
        meetingScheduled.value = scheduledMeeting.isScheduled;
        meetingSize.value = scheduledMeeting.isScheduled ? scheduledMeeting.meetingSize : 0;
      }
    }, 1000 * 60);
  } else {
    console.log(chalk.red("Schedule variable not found"));
  }
}
