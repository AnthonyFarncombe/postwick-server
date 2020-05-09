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
  text?: string;
  value: VariableValueType;
  toggle?: number;
  group?: string;
  plc?: PlcDataType;
}

export const storeEvents = new EventEmitter();

export class Variable {
  public readonly name: string;
  public readonly text?: string;
  private _value: VariableValueType;
  private _defaultValue: VariableValueType;
  private _toggle?: number;
  private _toggleTimeout?: NodeJS.Timeout;
  public readonly group?: string;
  public plc?: PlcDataType;

  constructor({
    name,
    text,
    value,
    toggle,
    group,
    plc,
  }: {
    name: string;
    text?: string;
    value: VariableValueType;
    toggle?: number;
    group?: string;
    plc?: PlcDataType;
  }) {
    this.name = name;
    this.text = text;
    this._value = value;
    this._defaultValue = value;
    this._toggle = toggle;
    this.group = group;
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
    let variablesFileName = path.resolve(__dirname, "variables.json");
    if (!fs.existsSync(variablesFileName)) variablesFileName = path.resolve(__dirname, "../data", "variables.json");

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
                text: v.text,
                value: v.value,
                toggle: v.toggle,
                group: v.group,
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

export default {
  variables,
};
