import dayjs from "dayjs";
import chalk from "chalk";
import store from "./store";
import Schedule, { ScheduleType } from "./models/schedule";

interface ScheduleWithNextDate {
  id: string;
  dayOfWeek: string;
  timeOfMeeting: string;
  frequency: string;
  startDate?: string;
  overrideDay: boolean;
  meetingSize: number;
  nextDate: string;
}

const daysOfTheWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const generateNextDate = (overrideDays: string[], schedule: ScheduleType): ScheduleWithNextDate => {
  // Start with today's date but at the time of the meeting
  const initDate = dayjs()
    .hour(parseInt(schedule.timeOfMeeting.substr(0, 2)))
    .minute(parseInt(schedule.timeOfMeeting.substr(3, 2)))
    .second(0)
    .millisecond(0);
  let nextDate = initDate;

  // If a start date has been specified then adjust to that date
  if (schedule.startDate) {
    nextDate = nextDate
      .year(parseInt(schedule.startDate.substr(0, 4)))
      .month(parseInt(schedule.startDate.substr(5, 2)) - 1)
      .date(parseInt(schedule.startDate.substr(8, 2)));
  }

  // Function to check if override exists
  const overrideExists = (): boolean => overrideDays.filter(d => d === nextDate.format("YYYY-MM-DD")).length > 0;

  // Adjust date to be on the specified day of the week
  if (["1", "2", "3"].includes(schedule.frequency)) {
    const dayIndex = daysOfTheWeek.indexOf(schedule.dayOfWeek);
    nextDate = nextDate.day(dayIndex);

    // Calculate how many weeks in the past the date is
    let weeks = initDate.diff(nextDate, "week", true);
    weeks = Math.ceil(weeks / parseInt(schedule.frequency)) * parseInt(schedule.frequency);
    if (weeks > 0) {
      // Advance date into the future
      nextDate = nextDate.add(weeks, "week");
    }

    // Continue to advance date if other schedules override it
    while (overrideExists()) {
      nextDate = nextDate.add(parseInt(schedule.frequency), "week");
    }
  } else if (schedule.frequency === "CM") {
    // Function to calculate care meeting date from month
    const getCareMeetingDate = (month: number): dayjs.Dayjs => {
      let date = initDate
        .month(month)
        .date(1)
        .day(7);
      if (date.date() > 7) date = date.add(-7, "day");
      date = date.add(-1, "day");
      return date;
    };

    // Get care meeting date
    nextDate = getCareMeetingDate(initDate.month());

    // If the date is in the past then advance it a month
    if (nextDate < initDate) nextDate = getCareMeetingDate(initDate.month() + 1);

    // Advance the date a month if an override exists
    while (overrideExists()) {
      nextDate = getCareMeetingDate(nextDate.month() + 1);
    }
  }

  return {
    id: schedule.id,
    dayOfWeek: schedule.dayOfWeek,
    timeOfMeeting: schedule.timeOfMeeting,
    frequency: schedule.frequency,
    startDate: schedule.startDate,
    overrideDay: schedule.overrideDay,
    meetingSize: schedule.meetingSize,
    nextDate: nextDate.toISOString(),
  };
};

export async function getSchedules(): Promise<ScheduleWithNextDate[]> {
  try {
    const schedules = await Schedule.find().exec();

    // Process override schedules first as these take priority
    const overrideSchedules = schedules.filter(s => s.overrideDay).map(s => generateNextDate([], s));

    // Get an array of override days
    const overrideDays = overrideSchedules.map(s => dayjs(s.nextDate).format("YYYY-MM-DD"));

    // Process all other schedules
    const schedulesWithNextDate = schedules
      .filter(s => !s.overrideDay)
      .map(s => generateNextDate(overrideDays, s))
      .filter(s => dayjs(s.nextDate).isAfter(dayjs()));

    // Add the override schedules back in
    overrideSchedules.forEach(s => schedulesWithNextDate.push(s));

    // Remove schedules in the past
    for (let i = schedulesWithNextDate.length - 1; i >= 0; i--) {
      if (dayjs().isAfter(schedulesWithNextDate[i].nextDate)) {
        schedulesWithNextDate.splice(i, 1);
      }
    }

    // Sort by next date
    schedulesWithNextDate.sort((a, b) => {
      if (a.nextDate < b.nextDate) return -1;
      if (a.nextDate > b.nextDate) return 1;
      return 0;
    });

    return schedulesWithNextDate;
  } catch (err) {
    console.log(chalk.red(err));
    return [];
  }
}

export async function getNextSchedule(): Promise<ScheduleWithNextDate | null> {
  const schedules = await getSchedules();
  if (schedules && schedules.length > 0) return schedules[0];
  return null;
}

export async function getMinutesUntilNextMeeting(): Promise<{ minutes: number; size: number }> {
  const nextSchedule = await getNextSchedule();
  if (nextSchedule) {
    return {
      minutes: dayjs(nextSchedule.nextDate).diff(dayjs(), "minute"),
      size: nextSchedule.meetingSize,
    };
  }
  return { minutes: -100, size: 0 };
}

export async function startScheduler(): Promise<void> {
  console.log(chalk.green("Starting scheduler"));

  // Get variables mapped to the PLC
  const minutesUntilNextMeeting = store.variables.find(v => v.name === "minutesUntilNextMeeting");
  const scheduledMeetingSize = store.variables.find(v => v.name === "scheduledMeetingSize");

  // Check both PLC variables have been found
  if (minutesUntilNextMeeting && scheduledMeetingSize) {
    // Create function to lookup the next schedule
    const checkNextSchedule = async (): Promise<void> => {
      const nextSchedule = await getNextSchedule();
      if (nextSchedule) {
        minutesUntilNextMeeting.value = dayjs(nextSchedule.nextDate).diff(dayjs(), "minute");
        scheduledMeetingSize.value = nextSchedule.meetingSize;
      } else {
        minutesUntilNextMeeting.value = -100;
        scheduledMeetingSize.value = 0;
      }
    };

    // Call the function for the first run
    await checkNextSchedule();

    // Rerun the function every minute
    setInterval(async () => {
      await checkNextSchedule();
    }, 1000 * 60);
  } else {
    console.log(chalk.red("Schedule variable not found"));
  }
}
