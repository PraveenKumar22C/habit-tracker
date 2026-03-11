import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  habitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habit',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  daysOfWeek: {
    type: [Number],
    default: [0, 1, 2, 3, 4, 5, 6],
  },
  type: {
    type: String,
    enum: ['whatsapp', 'email', 'notification'],
    default: 'notification',
  },
  lastSent: {
    type: Date,
    default: null,
  },
  active: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Reminder', reminderSchema);
