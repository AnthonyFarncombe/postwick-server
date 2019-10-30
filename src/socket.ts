import socket from "socket.io";
import { Server } from "http";
import chalk from "chalk";
import store, { Variable } from "./store";

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

    socket.on("setVariableValue", (data, fn) => {
      console.log(data);
      fn && fn(data);
    });

    socket.on("getVariables", (_data: object, fn: Function) => {
      fn && fn(store.variables);
    });

    socket.on("disconnect", () => {
      const index = sessions.indexOf(session);
      if (index > -1) sessions.splice(index, 1);
    });
  });
};

export function sendUpdateToClient(variables: Variable[]): void {
  console.log(variables);
  sessions.forEach(s => {
    s.socket.emit("variablesUpdated", variables);
  });
}
