import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId;
    },
  },
  name: { type: String, required: true },
  googleId: { type: String, unique: true, sparse: true },
  phone: { type: String, default: null },
  whatsappNumber: { type: String, default: null },
  profileImage: { type: String, default: null },
  authMethod: { type: String, enum: ["email", "google"], default: "email" },
  isAdmin: { type: Boolean, default: false },
  whatsappSandbox: {
    joined: { type: Boolean, default: false },
    sessionActive: { type: Boolean, default: false },
    lastMessageAt: { type: Date, default: null },
    joinedAt: { type: Date, default: null },
    failReason: { type: String, default: null },
  },

  preferences: {
    theme: { type: String, enum: ["light", "dark"], default: "dark" },
    reminderTime: { type: String, default: "09:00" },
    reminderType: {
      type: String,
      enum: ["daily", "weekly", "both"],
      default: "daily",
    },
    whatsappReminders: { type: Boolean, default: false },
  },
  stats: {
    totalHabits: { type: Number, default: 0 },
    totalCompletions: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model("User", userSchema);
