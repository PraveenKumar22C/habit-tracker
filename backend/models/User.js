// ─────────────────────────────────────────────────────────────────────────────
// ADD THIS FIELD to the existing User schema (inside userSchema definition)
// Place it alongside the other top-level fields like phone, whatsappNumber etc.
// ─────────────────────────────────────────────────────────────────────────────

/*
  whatsappSandbox: {
    joined:        { type: Boolean,  default: false },
    sessionActive: { type: Boolean,  default: false },
    lastMessageAt: { type: Date,     default: null  },   // last time user messaged sandbox
    joinedAt:      { type: Date,     default: null  },
    failReason:    { type: String,   default: null  },   // last delivery failure reason
  },
*/

// ─────────────────────────────────────────────────────────────────────────────
// Full updated User.js with sandbox session tracking
// ─────────────────────────────────────────────────────────────────────────────
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String, required: true, unique: true, lowercase: true, trim: true,
  },
  password: {
    type: String,
    required: function() { return !this.googleId; },
  },
  name:         { type: String, required: true },
  googleId:     { type: String, unique: true, sparse: true },
  phone:        { type: String, default: null },
  whatsappNumber: { type: String, default: null },
  profileImage: { type: String, default: null },
  authMethod:   { type: String, enum: ['email', 'google'], default: 'email' },
  isAdmin:      { type: Boolean, default: false },

  // ── Twilio Sandbox Session ────────────────────────────────────────────────
  // Tracks whether this user has an active 24-hour sandbox session.
  // Twilio sandbox ONLY delivers messages if the user messaged the sandbox
  // within the last 24 hours. We track this so we can:
  //   1. Skip users with no active session (avoid wasting API calls)
  //   2. Show admin a list of users who need to re-ping
  //   3. Auto-update session status from Twilio delivery callbacks
  whatsappSandbox: {
    joined:        { type: Boolean, default: false  },   // has ever sent join code
    sessionActive: { type: Boolean, default: false  },   // sent a message in last 24h
    lastMessageAt: { type: Date,    default: null   },   // last inbound msg from user
    joinedAt:      { type: Date,    default: null   },   // when they first joined
    failReason:    { type: String,  default: null   },   // last Twilio error message
  },

  preferences: {
    theme:              { type: String, enum: ['light', 'dark'], default: 'dark' },
    reminderTime:       { type: String, default: '09:00' },
    reminderType:       { type: String, enum: ['daily', 'weekly', 'both'], default: 'daily' },
    whatsappReminders:  { type: Boolean, default: false },
  },
  stats: {
    totalHabits:      { type: Number, default: 0 },
    totalCompletions: { type: Number, default: 0 },
    currentStreak:    { type: Number, default: 0 },
    longestStreak:    { type: Number, default: 0 },
  },
  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now },
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) { next(error); }
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('User', userSchema);