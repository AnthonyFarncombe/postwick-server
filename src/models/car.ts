import mongoose, { Schema, Document } from "mongoose";

export interface CarType extends Document {
  timestamp: Date;
  plateText: string;
  approved: boolean;
}

const carSchema: Schema = new Schema({
  timestamp: { type: Date, required: true },
  plateText: { type: String, required: true },
  approved: { type: Boolean, required: true },
});

export default mongoose.model<CarType>("Car", carSchema);
