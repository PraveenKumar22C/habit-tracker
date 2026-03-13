import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import passport from 'passport';
import passportGoogle from 'passport-google-oauth20';
import authRoutes from './routes/auth.js';
import habitRoutes from './routes/habits.js';
import analyticsRoutes from './routes/analytics.js';
import remindersRoutes from './routes/reminders.js';
import whatsappRoutes from './routes/whatsapp.js';
import User from './models/User.js';
import reminderScheduler from './services/reminderScheduler.js';
import keepAlive from './services/keepAlive.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(
      (allowed) => origin === allowed || origin === allowed?.replace(/\/$/, '')
    );
    if (isAllowed) return callback(null, true);
    console.error(`[CORS] Blocked: ${origin}`);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.options('*', cors());
app.use(express.json());
app.use(passport.initialize());

passport.use(new passportGoogle.Strategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
        avatar: profile.photos[0]?.value,
        authMethod: 'google',
      });
    }
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try { done(null, await User.findById(id)); }
  catch (e) { done(e, null); }
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/habit-tracker', {
  serverSelectionTimeoutMS: 10000,
  family: 4,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/auth',      authRoutes);
app.use('/api/habits',    habitRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/whatsapp',  whatsappRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    whatsapp: reminderScheduler.getStatus(),
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);

  reminderScheduler.start();

  keepAlive.start();
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  keepAlive.stop();
  reminderScheduler.stop();
  process.exit(0);
});