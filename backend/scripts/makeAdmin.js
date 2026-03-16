import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/makeAdmin.js <email>");
  process.exit(1);
}

await mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/habit-tracker",
);

const user = await User.findOneAndUpdate(
  { email },
  { isAdmin: true },
  { new: true },
);

if (!user) {
  console.error(`No user found with email: ${email}`);
} else {
  console.log(`✅  ${user.name} (${user.email}) is now an admin.`);
}

await mongoose.disconnect();
