import mongoose, { Schema, Document } from "mongoose";

export interface ScheduleType extends Document {
  dayOfWeek: string;
  timeOfMeeting: string;
  frequency: string;
  startDate?: string;
  overrideDay: boolean;
  meetingSize: number;
}

const scheduleSchema: Schema = new Schema({
  dayOfWeek: { type: String, required: true },
  timeOfMeeting: { type: String, required: true },
  frequency: { type: String, required: true },
  startDate: { type: String },
  overrideDay: { type: Boolean },
  meetingSize: { type: Number, required: true },
});

export default mongoose.model<ScheduleType>("Schedule", scheduleSchema);
