import mongoose from "mongoose";

const habitLogSchema = new mongoose.Schema({
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
    default: () => new Date().setHours(0, 0, 0, 0),
  },
  completed: {
    type: Boolean,
    default: false,
  },
  value: {
    type: Number,
    default: 1,
  },
  notes: {
    type: String,
    default: "",
  },
  milestone: {
    reached: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ["3-day", "7-day", "21-day", "30-day", "100-day"],
      required: false,
      default: undefined,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

habitLogSchema.index({ habitId: 1, date: -1 });
habitLogSchema.index({ userId: 1, date: -1 });

export default mongoose.model("HabitLog", habitLogSchema);
