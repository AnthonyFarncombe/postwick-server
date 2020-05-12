import mongoose, { Schema, Document } from "mongoose";

export interface ScheduleType extends Document {
  name: string;
  dayOfWeek: string;
  frequency: number;
  date?: Date;
}

const scheduleSchema: Schema = new Schema({
  name: { type: String, required: true },
  dayOfWeek: { type: String, required: true },
  frequency: { type: Number },
  date: { type: Date },
  overrideDay: { type: Boolean },
});

export default mongoose.model<ScheduleType>("Schedule", scheduleSchema);
