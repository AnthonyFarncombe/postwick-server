import mongoose, { Schema, Document } from 'mongoose';

export interface User extends Document {
  firstName: string;
  lastName: string;
  email: string;
}

const UserSchema: Schema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
});

export default mongoose.model<User>('User', UserSchema);
