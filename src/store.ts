import path from "path";
import fs from "fs";
import chalk from "chalk";
import { EventEmitter } from "events";
import VariableLog from "./models/variableLog";

export type VariableValueType = boolean | number;

async function logToDb(variable: Variable): Promise<void> {
  try {
    const variableLog = new VariableLog({ timestamp: new Date(), name: variable.name, value: variable.value });
    await variableLog.save();
  } catch (err) {}
}

interface PlcDataType {
  type: "bool" | "int8" | "int16";
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
  log?: boolean;
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
  public readonly log?: boolean;
  public plc?: PlcDataType;

  constructor({
    name,
    text,
    value,
    toggle,
    group,
    log,
    plc,
  }: {
    name: string;
    text?: string;
    value: VariableValueType;
    toggle?: number;
    group?: string;
    log?: boolean;
    plc?: PlcDataType;
  }) {
    this.name = name;
    this.text = text;
    this._value = value;
    this._defaultValue = value;
    this._toggle = toggle;
    this.group = group;
    this.log = log;
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
    if (this.log) logToDb(this);

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
                log: v.log,
                plc: v.plc,
              }),
            );
          });
        } catch (err2) {
          if (err2) console.log(chalk.red(err2.message));
        }
      }

      storeEvents.emit("variablesLoaded", variables);

      resolve();
    });
  });
}

export default {
  variables,
};
