import moment from "moment";
import store from "./store";
import Schedule from "./models/schedule";

const meetingScheduled = store.variables.find(v => v.name === "meetingScheduled");

export async function isMeetingScheduled(): Promise<boolean> {
  // Get current day of week
  const dayOfWeek: string = moment().format("dddd");

  // Get all schedules for that day
  const schedules = await Schedule.find({ dayOfWeek: dayOfWeek });

  // Exclude any schedules that are non recurring and not for today
  while (true) {
    const index = schedules.findIndex(s => s.frequency === "0" && s.startDate === moment().toDate());
    if (index > -1) schedules.splice(index, 1);
    else break;
  }

  // Get reference to current day
  const today = moment.utc().startOf("day");

  // Exclude any schedules that do not occur on the current week
  while (true) {
    const index = schedules.findIndex(
      s =>
        parseInt(s.frequency) > 1 && s.startDate && today.diff(s.startDate, "days") % (parseInt(s.frequency) * 7) === 0,
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
  //

  return schedules.length > 0;
}

setInterval(async () => {
  if (meetingScheduled) meetingScheduled.value = await isMeetingScheduled();
}, 1000 * 60);
