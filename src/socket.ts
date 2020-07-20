import socket from "socket.io";
import { Server } from "http";
import chalk from "chalk";
import store, { storeEvents, Variable } from "./store";
import Schedule, { ScheduleType } from "./models/schedule";

interface Session {
  socket: socket.Socket;
}

interface ScheduleSocketType {
  id: string;
  dayOfWeek: string;
  timeOfMeeting: string;
  frequency: string;
  startDate?: Date;
  overrideDay: boolean;
}

const mapSchedule = (schedule: ScheduleType): ScheduleSocketType => ({
  id: schedule.id,
  dayOfWeek: schedule.dayOfWeek,
  timeOfMeeting: schedule.timeOfMeeting,
  frequency: schedule.frequency,
  startDate: schedule.startDate,
  overrideDay: schedule.overrideDay,
});

const sessions: Session[] = [];

export default (http: Server): void => {
  const io = socket(http, { origins: "*:*" });

  io.on("connection", socket => {
    const session: Session = { socket };
    sessions.push(session);

    console.log(chalk.green(`Client '${socket.id}' has connected`));

    socket.on("setVariableValue", (data: { name: string; value: boolean | number }, fn: Function) => {
      if (data && data.name) {
        const variable = store.variables.find(v => v.name === data.name);
        if (variable) {
          variable.value = data.value;
          fn && fn({ name: variable.name, value: variable.value });
          return;
        }
      }

      fn && fn({ error: "Variable not found!" });
    });

    socket.on("getVariables", (_data: object, fn: Function) => {
      fn && fn(store.variables.map(v => ({ name: v.name, text: v.text, value: v.value, group: v.group })));
    });

    socket.on("getSchedules", (_data: object, fn: Function) => {
      Schedule.find((err, res) => {
        if (err) {
          console.log(chalk.red("Error loading schedules"));
          fn && fn([]);
        } else {
          fn && fn(res.map(s => mapSchedule(s)));
        }
      });
    });

    socket.on("saveSchedule", async (data: ScheduleType, fn: Function) => {
      // Check a schedule has been passed
      if (!data) return fn && fn();

      try {
        if (data.id) {
          // Update existing schedule
          const schedule = await Schedule.findById(data.id);
          if (schedule) {
            Object.assign(schedule, data);
            await schedule.save();
            fn && fn(schedule);
          } else {
            fn && fn({ error: "Schedule not found!" });
          }
        } else {
          // Create new schedule
          const schedule = new Schedule(data);
          await schedule.save();
          fn && fn(schedule);
        }

        Schedule.find((err, res) => {
          if (err) console.log(chalk.red("Error loading schedules"));
          else
            socket.emit(
              "schedulesUpdated",
              res.map(s => mapSchedule(s)),
            );
        });
      } catch (err) {
        console.error(err);
        fn && fn(err);
      }
    });

    socket.on("deleteSchedule", async (id: string, fn: Function) => {
      if (!id) {
        fn && fn();
        return;
      }

      try {
        await Schedule.findByIdAndDelete(id);
        fn && fn();
      } catch (err) {
        fn && fn(err);
      }

      Schedule.find((err, res) => {
        if (err) console.log(chalk.red("Error loading schedules"));
        else
          socket.emit(
            "schedulesUpdated",
            res.map(s => mapSchedule(s)),
          );
      });
    });

    socket.on("disconnect", () => {
      console.log(chalk.yellow(`Client '${socket.id} has disconnected`));
      const index = sessions.indexOf(session);
      if (index > -1) sessions.splice(index, 1);
    });
  });
};

storeEvents.on("valueChanged", (variable: Variable) => {
  sessions.forEach(s => s.socket.emit("variableValueUpdated", { name: variable.name, value: variable.value }));
});
