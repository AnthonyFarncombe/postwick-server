import net from "net";
import chalk from "chalk";
import store, { VariableJson, storeEvents } from "./store";

let readVariables: VariableJson[] = [];
let writeVariables: VariableJson[] = [];
let receiveBuffer: Buffer = Buffer.alloc(0);

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
    buffer.writeUInt16BE(100, 2);

    // Write variable values to buffer
    writeVariables.forEach(v => {
      if (v.plc?.type === "bool" && typeof v.plc.bit === "number" && v.value) {
        buffer[v.plc.byte] |= 0x1 << v.plc.bit;
      } else if (v.plc?.type === "int8") {
        buffer.writeInt8(v.value as number, v.plc.byte);
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
    } else if (v.plc?.type === "int8") {
      v.value = chunk.readInt8(v.plc.byte);
    } else if (v.plc?.type === "int16") {
      v.value = chunk.readInt16BE(v.plc.byte);
    } else if (v.plc?.type === "uint16") {
      v.value = chunk.readUInt16BE(v.plc.byte);
    } else if (v.plc?.type === "int32") {
      v.value = chunk.readInt32BE(v.plc.byte);
    }
  });
}

client.on("data", chunk => {
  let bufferLength = 0;

  if (chunk[0] === 0xfe && chunk[1] === 1) {
    bufferLength = chunk.readInt16BE(2);
    receiveBuffer = chunk;
  } else {
    receiveBuffer = Buffer.concat([receiveBuffer, chunk]);
  }

  if (receiveBuffer.length === bufferLength) {
    if (receiveBuffer[0] !== 0xfe) {
      console.log(chalk.redBright(`Expected first byte to equal 0xfe but received 0x${receiveBuffer[0].toString(16)}`));
    } else if (receiveBuffer[1] !== 1) {
      console.log(chalk.redBright(`Expected version number to equal 1 but received ${receiveBuffer[0]}`));
    } else if (receiveBuffer[bufferLength - 1] !== 0xfb) {
      console.log(
        chalk.redBright(
          `Expected last byte to equal 0xfb but received 0x${receiveBuffer[bufferLength - 1].toString(16)}`,
        ),
      );
    } else {
      let checksum = 0;
      for (let i = 4; i < bufferLength - 2; i++) {
        checksum = (checksum + receiveBuffer[i]) % 0x100;
      }

      if (receiveBuffer[bufferLength - 2] !== checksum) {
        console.log(
          chalk.redBright(`Expected checksum of ${checksum} but received ${receiveBuffer[bufferLength - 2]}`),
        );
      } else {
        processReceiveBuffer(receiveBuffer);
      }
    }
  }
});
