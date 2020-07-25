import mongoose, { Schema, Document } from "mongoose";

export interface CarType extends Document {
  timestamp: Date;
  imagePathOrig?: string;
  imagePathCropped?: string;
  plateText?: string;
  approved: boolean;
}

const carSchema: Schema = new Schema({
  timestamp: { type: Date, required: true },
  imagePathOrig: { type: String, required: false },
  imagePathCropped: { type: String, required: false },
  plateText: { type: String, required: false },
  approved: { type: Boolean, required: true },
});

export default mongoose.model<CarType>("Car", carSchema);
