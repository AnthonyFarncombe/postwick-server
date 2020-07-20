import { storeEvents, Variable } from "./store";
import { sendMail } from "./email";
import { logToDb } from "./logger";

let varsToMonitor: string[] = [];
let enableMonitor = false;

storeEvents.on("variablesLoaded", (variables: Variable[]) => {
  varsToMonitor = variables.filter(v => v.monitor).map(v => v.name);
  setTimeout(() => (enableMonitor = true), 5000);
});

async function logEventsToDb(variable: Variable): Promise<void> {
  if (varsToMonitor.includes(variable.name)) {
    await logToDb({ name: variable.name, value: variable.value });
  }
}

storeEvents.on("valueChanged", async (variable: Variable) => {
  if (enableMonitor) await logEventsToDb(variable);

  if (!variable.value) return;

  const match = /^([a-z]+)AlarmTriggered$/.exec(variable.name);
  if (!match) return;

  sendMail({
    to: [
      { name: "Anthony Farncombe", address: "anthony.farncombe@redpack.co.uk" },
      { name: "Tim Percival", address: "tim.percival@dunhamswashrooms.com" },
    ],
    template: "alarm",
    subject: match[1][0].toUpperCase() + match[1].slice(1) + " Alarm Triggered - Postwick",
    context: { type: match[1] },
  });
});
