import mongoose, { Schema, Document } from "mongoose";

export interface CarType extends Document {
  plateText: string;
  name?: string;
  vehicleType?: string;
}

const carSchema: Schema = new Schema({
  plateText: { type: String, required: true },
  name: { type: String, required: false },
  vehicleType: { type: String, required: false },
});

export default mongoose.model<CarType>("Car", carSchema);
