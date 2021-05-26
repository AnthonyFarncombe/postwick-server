import socket from "socket.io";
import { Server } from "http";
import chalk from "chalk";
import store, { storeEvents, Variable } from "./store";
import Schedule, { ScheduleType } from "./models/schedule";
import { getSchedules } from "./scheduler";

interface Session {
  socket: socket.Socket;
}

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

      fn && typeof fn === "function" && fn({ error: "Variable not found!" });
    });

    socket.on("getVariables", (_data: object, fn: Function) => {
      let attempts = 0;
      const interval = setInterval(() => {
        if (store.variables.length > 0) {
          clearInterval(interval);
          fn &&
            typeof fn === "function" &&
            fn(store.variables.map(v => ({ name: v.name, text: v.text, value: v.value, group: v.group })));
        } else {
          attempts++;
          if (attempts++ > 20) {
            clearInterval(interval);
            fn &&
              typeof fn === "function" &&
              fn(store.variables.map(v => ({ name: v.name, text: v.text, value: v.value, group: v.group })));
          }
        }
      }, 500);
    });

    socket.on("getSchedules", async (_data: object, fn: Function) => {
      try {
        const schedules = await getSchedules();
        fn && typeof fn === "function" && fn(schedules);
      } catch (err) {
        console.log(chalk.red("Error loading schedules"));
        fn && typeof fn === "function" && fn([]);
      }
    });

    socket.on("saveSchedule", async (data: ScheduleType, fn: Function) => {
      // Check a schedule has been passed
      if (!data) return fn && typeof fn === "function" && fn();

      try {
        if (data.id) {
          // Update existing schedule
          const schedule = await Schedule.findById(data.id);
          if (schedule) {
            Object.assign(schedule, data);
            await schedule.save();
            fn && typeof fn === "function" && fn(schedule);
          } else {
            fn && typeof fn === "function" && fn({ error: "Schedule not found!" });
          }
        } else {
          // Create new schedule
          const schedule = new Schedule(data);
          await schedule.save();
          fn && typeof fn === "function" && fn(schedule);
        }
      } catch (err) {
        console.error(err);
        fn && typeof fn === "function" && fn(err);
      }

      try {
        // Push new schedules to clients
        const schedules = await getSchedules();
        socket.emit("schedulesUpdated", schedules);
      } catch (err) {
        console.log(chalk.red("Error loading schedules"));
      }
    });

    socket.on("deleteSchedule", async (id: string, fn: Function) => {
      if (!id) {
        fn && typeof fn === "function" && fn();
        return;
      }

      try {
        await Schedule.findByIdAndDelete(id);
        fn && typeof fn === "function" && fn();
      } catch (err) {
        fn && typeof fn === "function" && fn(err);
      }

      try {
        // Push new schedules to clients
        const schedules = await getSchedules();
        socket.emit("schedulesUpdated", schedules);
      } catch (err) {
        console.log(chalk.red("Error loading schedules"));
      }
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
