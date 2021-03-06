import dotenv from "dotenv";
dotenv.config();

import "./server";
import "./mongoose";
import "./alerts";
import { load as loadStore } from "./store";
import { connect as connectPlc } from "./plc";
import { startScheduler } from "./scheduler";

(async (): Promise<void> => {
  await loadStore();
  connectPlc();
  await startScheduler();
})();
