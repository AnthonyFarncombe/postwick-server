import net from "net";
import chalk from "chalk";
import { updateFromPlc, Variable } from "./store";

const host = process.env.PLC_IP_ADDRESS || "192.168.1.100";
const port = parseInt(process.env.PLC_PORT || "0");

const client = new net.Socket();

if (process.env.PLC_DISABLE === "TRUE") {
  console.log(chalk.magentaBright("PLC Disabled"));
} else {
  client.connect({ host, port });
}

client.on("connect", () => {
  console.log(chalk.green("Connected to PLC"));
});

client.on("error", err => {
  console.error(chalk.red(err.message));
});

client.on("close", hadError => {
  if (hadError) {
    console.log(chalk.magentaBright("Reconnecting to PLC"));
    setTimeout(() => client.connect({ host, port }), 3000);
  } else {
    console.log(chalk.blue("Disconnected from PLC"));
  }
});

client.on("data", chunk => {
  if (chunk.length === 86) {
    console.log(chalk.magenta((chunk.readInt8(15) & 0x20) > 0 ? "On" : "Off"));

    const variables: Variable[] = [
      { name: "mainHallLights1Value", value: (chunk.readUInt8(0) & 0x1) > 0 },
      { name: "mainHallLights2Value", value: (chunk.readUInt8(0) & 0x2) > 0 },
      { name: "mainHallLights3Value", value: (chunk.readUInt8(0) & 0x4) > 0 },
      { name: "mainHallLights4Value", value: (chunk.readUInt8(0) & 0x8) > 0 },
      { name: "mainHallLights5Value", value: (chunk.readUInt8(0) & 0x10) > 0 },
    ];

    updateFromPlc(variables);
  } else {
    console.log(chalk.blueBright(chunk.length.toString()));
  }
});
