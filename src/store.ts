import path from "path";
import fs from "fs";
import { EventEmitter } from "events";
import chalk from "chalk";

export type VariableValueType = boolean | number;

interface PlcDataType {
  type: "bool" | "int16";
  action: "read" | "write";
  byte: number;
  bit?: number;
}

export interface VariableJson {
  name: string;
  value: VariableValueType;
  toggle?: number;
  plc?: PlcDataType;
}

export const storeEvents = new EventEmitter();

class Variable {
  public readonly name: string;
  private _value: VariableValueType;
  private _defaultValue: VariableValueType;
  private _toggle?: number;
  private _toggleTimeout?: NodeJS.Timeout;
  public plc?: PlcDataType;

  constructor({
    name,
    value,
    toggle,
    plc,
  }: {
    name: string;
    value: VariableValueType;
    toggle?: number;
    plc?: PlcDataType;
  }) {
    this.name = name;
    this._value = value;
    this._defaultValue = value;
    this._toggle = toggle;
    this.plc = plc;
  }

  get value(): VariableValueType {
    return this._value;
  }
  set value(value: VariableValueType) {
    let newValue: VariableValueType;

    if (typeof this._value === "boolean") {
      newValue = !!value;
    } else if (typeof this._value === "number" && typeof value === "number") {
      newValue = value;
    } else {
      return;
    }

    if (newValue === this._value) return;
    this._value = newValue;

    storeEvents.emit("valueChanged", this);

    if (this._toggle) {
      this._toggleTimeout && clearTimeout(this._toggleTimeout);
      this._toggleTimeout = setTimeout(() => (this.value = this._defaultValue), this._toggle);
    }
  }
}

export const variables: Variable[] = [];

export function load(): Promise<void> {
  return new Promise((resolve): void => {
    const variablesFileName = path.resolve(__dirname, "../", "data", "variables.json");

    fs.readFile(variablesFileName, "utf8", (err, data) => {
      if (err) {
        console.log(chalk.red(err.message));
      } else {
        try {
          const jsonData: VariableJson[] = JSON.parse(data);

          jsonData.forEach(v => {
            variables.push(
              new Variable({
                name: v.name,
                value: v.value,
                toggle: v.toggle,
                plc: v.plc,
              }),
            );
          });
        } catch (err2) {
          if (err2) console.log(chalk.red(err2.message));
        }
      }

      resolve();
    });
  });
}

// export function updateFromPlc(variablesFromPlc: VariableJson[]): void {
//   const updatedVars = variablesFromPlc
//     .map(newVar => ({ oldVar: variables.find(v => v.name === newVar.name), newVar }))
//     .filter(v => v.oldVar && v.oldVar.value !== v.newVar.value);

//   updatedVars.forEach(v => {
//     if (!v.oldVar) return;
//     v.newVar.value = v.oldVar.value;
//   });
// }

export default {
  variables,
  // updateFromPlc,
};
