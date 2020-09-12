import socket from "socket.io";
import { Server } from "http";
import chalk from "chalk";
import store, { storeEvents, Variable } from "./store";
import Schedule, { ScheduleType } from "./models/schedule";
import { login } from "./auth";

interface Session {
  socket: socket.Socket;
  authenticated: boolean;
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
    const authenticated = new RegExp(process.env.HMI_CLIENT_IP || "invalid").test(socket.handshake.address);
    console.log(authenticated, socket.handshake.address);
    const session: Session = { socket, authenticated };

    sessions.push(session);

    console.log(chalk.green(`Client '${socket.id}' has connected`));

    socket.on("getAuthenticationState", (_, fn) => fn && typeof fn === "function" && fn(session.authenticated));

    socket.on("login", async (data: { email: string; password: string }, fn: Function) => {
      if (!fn || typeof fn !== "function") return;

      if (new RegExp(process.env.HMI_CLIENT_IP || "invalid").test(socket.handshake.address)) {
        //
      }

      try {
        const response = await login({ email: data.email, password: data.password, ip: socket.handshake.address });
        fn(response);
      } catch (err) {
        console.log(JSON.stringify(err));
        fn({ error: err });
      }
    });

    socket.on("loginJwt", (data: { token: string }, fn: Function) => {
      console.log(data);
      fn && typeof fn === "function" && fn(data);
    });

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
      fn &&
        typeof fn === "function" &&
        fn(store.variables.map(v => ({ name: v.name, text: v.text, value: v.value, group: v.group })));
    });

    socket.on("getSchedules", (_data: object, fn: Function) => {
      Schedule.find((err, res) => {
        if (err) {
          console.log(chalk.red("Error loading schedules"));
          fn && typeof fn === "function" && fn([]);
        } else {
          fn && typeof fn === "function" && fn(res.map(s => mapSchedule(s)));
        }
      });
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
        fn && typeof fn === "function" && fn(err);
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
