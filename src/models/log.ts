import mongoose, { Schema, Document } from "mongoose";

export interface LogType extends Document {
  timestamp: Date;
  type: string;
  description: string;
}

const logSchema: Schema = new Schema({
  timestamp: { type: Date, required: true },
  type: { type: String, required: true },
  description: { type: String },
});

export default mongoose.model<LogType>("Log", logSchema);
