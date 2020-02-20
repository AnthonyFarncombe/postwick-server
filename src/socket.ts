import socket from "socket.io";
import { Server } from "http";
import chalk from "chalk";
import store, { storeEvents, Variable } from "./store";
import Event from "./models/event";

interface Session {
  socket: socket.Socket;
}

const sessions: Session[] = [];

export default (http: Server): void => {
  const io = socket(http);

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

    socket.on("getEvents", (_data: object, fn: Function) => {
      Event.find((err, res) => {
        if (err) {
          console.log(chalk.red("Error loading events"));
          fn && fn([]);
        } else {
          fn && fn(res);
        }
      });
    });

    socket.on("disconnect", () => {
      const index = sessions.indexOf(session);
      if (index > -1) sessions.splice(index, 1);
    });
  });
};

storeEvents.on("valueChanged", (variable: Variable) => {
  sessions.forEach(s => s.socket.emit("variableValueUpdated", { name: variable.name, value: variable.value }));
});
