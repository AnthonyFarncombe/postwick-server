import mongoose, { Schema, Document } from "mongoose";

export interface EventLogType extends Document {
  timestamp: Date;
  type: string;
  description: number;
}

const eventLogSchema: Schema = new Schema({
  timestamp: { type: Date, required: true },
  type: { type: String, required: true },
  description: { type: Number, required: true },
});

export default mongoose.model<EventLogType>("EventLog", eventLogSchema);
