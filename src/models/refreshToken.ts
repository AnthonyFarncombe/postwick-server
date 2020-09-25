import mongoose, { Schema, Document } from "mongoose";

export interface RefreshTokenType extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  createdDate: Date;
}

const refreshTokenSchema: Schema = new Schema({
  userId: { type: mongoose.Types.ObjectId, required: true },
  token: { type: String, required: true },
  createdDate: { type: Date, required: true },
});

export default mongoose.model<RefreshTokenType>("RefreshToken", refreshTokenSchema);
