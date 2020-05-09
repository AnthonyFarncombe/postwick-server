import dotenv from "dotenv";
dotenv.config();

import "./server";
import "./mongoose";
import { load as loadStore } from "./store";
import { connect as connectPlc } from "./plc";

(async (): Promise<void> => {
  await loadStore();
  connectPlc();
})();
