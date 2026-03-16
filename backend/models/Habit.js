import mongoose from "mongoose";

const habitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
  },
  category: {
    type: String,
    enum: [
      "health",
      "fitness",
      "learning",
      "productivity",
      "mindfulness",
      "social",
      "other",
    ],
    default: "other",
  },
  color: {
    type: String,
    default: "#3b82f6",
  },
  frequency: {
    type: String,
    enum: ["daily", "weekly", "custom"],
    default: "daily",
  },
  target: {
    value: {
      type: Number,
      default: 1,
    },
    unit: {
      type: String,
      default: "times",
      enum: ["times", "hours", "minutes", "km", "pages", "items"],
    },
  },
  reminder: {
    enabled: {
      type: Boolean,
      default: false,
    },
    time: {
      type: String,
      default: "09:00",
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  stats: {
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    totalCompletions: {
      type: Number,
      default: 0,
    },
    completionRate: {
      type: Number,
      default: 0,
    },
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Habit", habitSchema);
