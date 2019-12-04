import mongoose, { Schema, Document } from "mongoose";

export interface EventType extends Document {
  name: string;
  dayOfWeek: string;
  frequency: number;
  date?: Date;
}

const eventSchema: Schema = new Schema({
  name: { type: String, required: true },
  dayOfWeek: { type: String, required: true },
  frequency: { type: Number, required: true },
  date: { type: Date },
});

export default mongoose.model<EventType>("Event", eventSchema);
