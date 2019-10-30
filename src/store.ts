import path from "path";
import fs from "fs";
import chalk from "chalk";

export interface Variable {
  name: string;
  plc?: "read" | "write";
  value: boolean | number;
}

export const variables: Variable[] = [];

const variablesFileName = path.resolve(__dirname, "../", "data", "variables.json");
fs.readFile(variablesFileName, "utf8", (err, data) => {
  if (err) return console.log(chalk.red(err.message));
  try {
    const jsonData: Variable[] = JSON.parse(data);
    jsonData.forEach(v => variables.push(v));
  } catch (err2) {
    if (err2) return console.log(chalk.red(err2.message));
  }
});

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
