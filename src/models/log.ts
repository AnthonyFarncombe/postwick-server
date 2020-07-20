import mongoose, { Schema, Document } from "mongoose";

export interface LogType extends Document {
  timestamp: Date;
  name: string;
  value: number;
}

const logSchema: Schema = new Schema({
  timestamp: { type: Date, required: true },
  name: { type: String, required: true },
  value: { type: Number, required: true },
});

export default mongoose.model<LogType>("Log", logSchema);
