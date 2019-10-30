import mongoose, { Schema, Document } from "mongoose";

export interface UserType extends Document {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  roles: string[];
  resetToken: string;
  resetExpires: Date;
}

const userSchema: Schema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  passwordHash: { type: String },
  roles: [String],
  resetToken: String,
  resetExpires: Date,
});

userSchema.index({ email: 1 }, { unique: true });

export default mongoose.model<UserType>("User", userSchema);
