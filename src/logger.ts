import chalk from "chalk";
import moment from "moment";
import Log from "./models/log";
import { VariableValueType } from "./store";

export default (
  moduleName: string,
): {
  logInfo(msg: string): void;
  logSuccess(msg: string): void;
  logWarning(msg: string): void;
  logError(msg: string): void;
} => {
  return {
    logInfo(msg: string): void {
      console.log(
        chalk.blue(`[${moment().format("DD/MM/YYYY HH:mm:ss:SSS")}] `) +
          chalk.black.bgBlue(` ${moduleName.padStart(7, " ")} `) +
          chalk.blue(` ${msg}`),
      );
    },
    logSuccess(msg: string): void {
      console.log(
        chalk.green(`[${moment().format("DD/MM/YYYY HH:mm:ss:SSS")}] `) +
          chalk.black.bgGreen(` ${moduleName.padStart(7, " ")} `) +
          chalk.green(` ${msg}`),
      );
    },
    logWarning(msg: string): void {
      console.log(
        chalk.yellow(`[${moment().format("DD/MM/YYYY HH:mm:ss:SSS")}] `) +
          chalk.black.bgYellow(` ${moduleName.padStart(7, " ")} `) +
          chalk.yellow(` ${msg}`),
      );
    },
    logError(msg: string): void {
      console.error(
        chalk.red(`[${moment().format("DD/MM/YYYY HH:mm:ss:SSS")}] `) +
          chalk.black.bgRed(` ${moduleName.padStart(7, " ")} `) +
          chalk.red(` ${msg}`),
      );
    },
  };
};

export async function logToDb({ name, value }: { name: string; value: VariableValueType }): Promise<void> {
  try {
    const log = new Log({ timestamp: new Date(), name, value });
    await log.save();
  } catch (err) {}
}
