import mongoose, { Schema, Document } from "mongoose";

export interface CarType extends Document {
  plateText: string;
  name?: string;
  mobile?: string;
}

const carSchema: Schema = new Schema({
  plateText: { type: String, required: true },
  name: { type: String, required: false },
  mobile: { type: String, required: false },
});

export default mongoose.model<CarType>("Car", carSchema);
