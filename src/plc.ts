import net from "net";
import chalk from "chalk";
import store, { VariableJson, storeEvents } from "./store";

let readVariables: VariableJson[] = [];
let writeVariables: VariableJson[] = [];

function loadVariables(): void {
  readVariables = store.variables.filter(v => v.plc && v.plc.action === "read");
  writeVariables = store.variables.filter(v => v.plc && v.plc.action === "write");
}

const host = process.env.PLC_IP_ADDRESS || "192.168.1.100";
const port = parseInt(process.env.PLC_PORT || "0");

const client = new net.Socket();

export function connect(): void {
  if (process.env.PLC_DISABLE === "TRUE") {
    console.log(chalk.magentaBright("PLC Disabled"));
  } else {
    loadVariables();
    client.connect({ host, port });
  }
}

let connected = false;
let writePending = false;
let writeTimeout: NodeJS.Timeout | undefined;

async function writeToPlc(): Promise<void> {
  writeTimeout && clearTimeout(writeTimeout);
  writePending = false;

  if (connected) {
    const buffer: Buffer = Buffer.alloc(100);

    // Write header
    buffer[0] = 0xfe;

    // Comms version
    buffer[1] = 1;

    // Message length
    buffer.writeUInt16BE(100, 4);

    // Write variable values to buffer
    writeVariables.forEach(v => {
      if (v.plc?.type === "bool" && typeof v.plc.bit === "number" && v.value) {
        buffer[v.plc.byte] |= 0x1 << v.plc.bit;
      } else if (v.plc?.type === "int16") {
        buffer.writeInt16BE(v.value as number, v.plc.byte);
      }
    });

    // Calculate checksum
    for (let i = 4; i <= 97; i++) buffer[98] += buffer[i];

    // Write footer
    buffer[99] = 0xfb;

    // Dispatch buffer
    await new Promise(resolve =>
      client.write(buffer, err => {
        err && console.error(err);
        resolve();
      }),
    );
  }

  if (writePending) {
    writeToPlc();
  } else {
    writeTimeout = setTimeout(() => writeToPlc(), 5000);
  }
}

client.on("connect", () => {
  connected = true;
  console.log(chalk.green("Connected to PLC"));

  // Write initial data to PLC
  writePending = true;
  writeToPlc();

  storeEvents.on("valueChanged", (variable: VariableJson) => {
    if (variable.plc && variable.plc.action === "write") {
      writePending = true;
      writeToPlc();
    }
  });
});

client.on("error", err => {
  console.error(chalk.red(err.message));
});

client.on("close", hadError => {
  connected = false;
  if (hadError) {
    console.log(chalk.magentaBright("Reconnecting to PLC"));
    setTimeout(() => client.connect({ host, port }), 3000);
  } else {
    console.log(chalk.blue("Disconnected from PLC"));
  }
});

function processReceiveBuffer(chunk: Buffer): void {
  readVariables.forEach(v => {
    if (v.plc?.type === "bool" && typeof v.plc.bit === "number") {
      v.value = (chunk[v.plc.byte] & (0x1 << v.plc.bit)) > 0x0;
    } else if (v.plc?.type === "int16") {
      v.value = (chunk[v.plc.byte] << 0x8) + chunk[v.plc.byte + 0x1];
    }
  });
}

client.on("data", chunk => {
  const bufferLength = 100;

  if (chunk.length % bufferLength === 0) {
    for (let i = 0; i < chunk.length; i += bufferLength) {
      processReceiveBuffer(chunk.subarray(i, i + bufferLength));
    }
  } else {
    console.log(chalk.blueBright(chunk.length.toString()) + " " + chalk.redBright(chunk.toString()));
  }
});
