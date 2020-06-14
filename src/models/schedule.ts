import mongoose, { Schema, Document } from "mongoose";

export interface ScheduleType extends Document {
  dayOfWeek: string;
  timeOfMeeting: string;
  frequency: string;
  startDate?: Date;
  overrideDay: boolean;
}

const scheduleSchema: Schema = new Schema({
  dayOfWeek: { type: String, required: true },
  timeOfMeeting: { type: String, required: true },
  frequency: { type: String, required: true },
  startDate: { type: Date },
  overrideDay: { type: Boolean },
});

export default mongoose.model<ScheduleType>("Schedule", scheduleSchema);
