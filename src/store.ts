import path from "path";
import fs from "fs";
import { EventEmitter } from "events";
import chalk from "chalk";

export type VariableValueType = boolean | number;

export interface Variable {
  name: string;
  value: VariableValueType;
  setValue: (value: VariableValueType) => void;
  toggle?: number;
  plc?: {
    type: "bool" | "int16";
    action: "read" | "write";
    byte: number;
    bit?: number;
  };
}

export const storeEvents = new EventEmitter();

export const variables: Variable[] = [];

export function load(): Promise<void> {
  return new Promise((resolve): void => {
    const variablesFileName = path.resolve(__dirname, "../", "data", "variables.json");

    fs.readFile(variablesFileName, "utf8", (err, data) => {
      if (err) {
        console.log(chalk.red(err.message));
      } else {
        try {
          const jsonData: Variable[] = JSON.parse(data);

          jsonData.forEach(v => {
            v.setValue = function(value: VariableValueType): void {
              if (typeof v.value === "boolean") {
                this.value = !!value;
              } else if (typeof v.value === "number" && typeof value === "number") {
                this.value = value;
              }

              storeEvents.emit("valueChanged", v);

              // Check if toggle variable
              if (this.toggle) {
                //
              }
            };

            variables.push(v);
          });
        } catch (err2) {
          if (err2) console.log(chalk.red(err2.message));
        }
      }

      resolve();
    });
  });
}

export function updateFromPlc(variablesFromPlc: Variable[]): void {
  const updatedVars = variablesFromPlc
    .map(newVar => ({ oldVar: variables.find(v => v.name === newVar.name), newVar }))
    .filter(v => v.oldVar && v.oldVar.value !== v.newVar.value);

  updatedVars.forEach(v => {
    if (!v.oldVar) return;
    v.newVar.value = v.oldVar.value;
  });
}

export default {
  variables,
  updateFromPlc,
};
