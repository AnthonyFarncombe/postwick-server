import ModbusRTU from "modbus-serial";
import { isEqual } from "lodash";
import store, { Variable } from "./store";

// Create sort function
function sortVariables(a: Variable, b: Variable): number {
  const addressA = (a.modbus && a.modbus.address * 0x10 + (a.modbus.bit || 0)) || 0;
  const addressB = (b.modbus && b.modbus.address * 0x10 + (b.modbus.bit || 0)) || 0;
  return addressA < addressB ? -1 : 1;
}

function init(): void {
  // Get variables to read
  const variablesToRead = store.variables.filter(v => v.modbus && v.modbus.action === "read");
  variablesToRead.sort(sortVariables);

  let firstReadAddress = 0,
    lastReadAddress = 0;

  if (variablesToRead.length > 0) {
    firstReadAddress = (variablesToRead[0].modbus && variablesToRead[0].modbus.address) || 0;
    const lastReadModbus = variablesToRead[variablesToRead.length - 1].modbus;
    lastReadAddress = (lastReadModbus && lastReadModbus.address) || 0;
  }

  console.log(firstReadAddress, lastReadAddress);

  // Get variables to write
  const variablesToWrite = store.variables.filter(v => v.modbus && v.modbus.action === "write");
  variablesToWrite.sort(sortVariables);

  // const firstWriteAddress = (variablesToWrite[0].modbus && variablesToWrite[0].modbus.address) || 0;
  // const lastWriteModbus = variablesToWrite[variablesToWrite.length - 1].modbus;
  // const lastWriteAddress = (lastWriteModbus && lastWriteModbus.address) || 0;
}

const client = new ModbusRTU();

// function createWriteBuffer(): number[] {
//   const buffer = new Array<number>(lastWriteAddress - firstWriteAddress + 1);
//   variablesToWrite.forEach(v => {
//     const address = (v.modbus && v.modbus.address) || 0;
//     if (address === 0) return;
//     if (v.modbus && v.modbus.type === "boolean") {
//       if (v.value) buffer[address - firstWriteAddress] &= 1 << ((v.modbus && v.modbus.bit) || 0);
//     } else {
//       buffer[address - firstWriteAddress] = v.value as number;
//     }
//   });
//   return buffer;
// }

client.connectTCP(process.env.MODBUS_ADDRESS || "0.0.0.0", { port: 502 }, () => {
  client.setID(1);

  let retryCount = 0;
  let lastReceiveData: number[];
  let communicating = false;

  setInterval(async () => {
    if (!communicating) {
      // Prevent overlapping requests
      communicating = true;

      // Once the variable list has been loaded from the json file then prepare it for communication
      if (!store.variables.length) {
        init();
        communicating = false;
        return;
      }

      try {
        // Attempt reconnection if connection has failed
        if (!client.isOpen) {
          if (retryCount % 10 === 0) {
            client.open(() => {});
            retryCount = 0;
          }
          retryCount++;
          return;
        } else {
          retryCount = 0;
        }

        // Read variables
        const { data } = await client.readHoldingRegisters(150, 4);
        if (!isEqual(data, lastReceiveData)) {
          console.log(data);
          lastReceiveData = data;
        }

        // Write variables
        // const writeBuffer = createWriteBuffer();
        // await client.writeRegisters(firstWriteAddress, writeBuffer);
        // await writeVariables();
      } catch (err) {
        console.error(err);
      }
      communicating = false;
    }
  }, 1000);
});
