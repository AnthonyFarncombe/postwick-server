import mongoose, { Schema, Document } from "mongoose";

export interface VisitType extends Document {
  timestamp: Date;
  imageCaptureDuration?: [number, number];
  imageOcrDuration?: [number, number];
  imageNameOrig?: string;
  imageNameCropped?: string;
  plateText?: string;
  approved: boolean;
  name?: string;
  vehicleType?: string;
}

const visitSchema: Schema = new Schema({
  timestamp: { type: Date, required: true },
  imageCaptureDuration: { type: [Number, Number], required: false },
  imageOcrDuration: { type: [Number, Number], required: false },
  imageNameOrig: { type: String, required: false },
  imageNameCropped: { type: String, required: false },
  plateText: { type: String, required: false },
  approved: { type: Boolean, required: true },
  name: { type: String, required: false },
  vehicleType: { type: String, required: false },
});

export default mongoose.model<VisitType>("Visit", visitSchema);
