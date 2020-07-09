import { storeEvents, Variable } from "./store";
import { sendMail } from "./email";
import { logToDb } from "./logger";

async function logEventsToDb(variable: Variable): Promise<void> {
  try {
    if (variable.name === "securityAlarmEnabled" && variable.value) await logToDb("SecurityAlarmEnabled");
    else if (variable.name === "securityAlarmEnabled" && !variable.value) await logToDb("SecurityAlarmDisabled");
  } catch (err) {}
}

storeEvents.on("valueChanged", async (variable: Variable) => {
  await logEventsToDb(variable);

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
