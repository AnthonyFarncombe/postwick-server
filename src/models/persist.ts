import mongoose, { Schema, Document } from "mongoose";

export interface PersistType extends Document {
  name: string;
  value: number;
}

const persistSchema: Schema = new Schema({
  name: { type: String, required: true },
  value: { type: Number, required: true },
});

export default mongoose.model<PersistType>("Persist", persistSchema);
