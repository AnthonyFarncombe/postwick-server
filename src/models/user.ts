import mongoose, { Schema, Document } from "mongoose";

export interface UserType extends Document {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  passwordHash: string;
  hmiPin: string;
  roles: string[];
  notifications: string[];
  resetToken: string;
  resetExpires: Date;
}

const userSchema: Schema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String },
  passwordHash: { type: String },
  hmiPin: { type: String },
  roles: [String],
  notifications: [String],
  resetToken: String,
  resetExpires: Date,
});

userSchema.index({ email: 1 }, { unique: true });

export default mongoose.model<UserType>("User", userSchema);
