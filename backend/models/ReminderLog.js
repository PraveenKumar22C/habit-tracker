import mongoose from "mongoose";

const reminderLogSchema = new mongoose.Schema({
  habitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Habit",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  reminderSent: {
    type: Boolean,
    default: false,
  },
  reminderType: {
    type: String,
    enum: ["morning", "evening", "weekly"],
    default: "morning",
  },
  sentAt: {
    type: Date,
    default: null,
  },
  message: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ["pending", "sent", "failed"],
    default: "pending",
  },
  error: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

reminderLogSchema.index({ habitId: 1, date: 1 });
reminderLogSchema.index({ userId: 1, date: 1 });
reminderLogSchema.index({ reminderSent: 1, date: 1 });

export default mongoose.model("ReminderLog", reminderLogSchema);
