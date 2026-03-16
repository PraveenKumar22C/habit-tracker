export interface ValidationResult {
  valid: boolean;
  message: string;
}

export function validateEmail(email: string): ValidationResult {
  if (!email.trim()) return { valid: false, message: "Email is required." };
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email.trim()))
    return {
      valid: false,
      message: "Enter a valid email address (e.g. you@example.com).",
    };
  return { valid: true, message: "" };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) return { valid: false, message: "Password is required." };

  const errors: string[] = [];

  if (password.length < 8) errors.push("at least 8 characters");
  if (password.length > 13) errors.push("no more than 13 characters");
  if (!/[A-Z]/.test(password)) errors.push("one uppercase letter (A–Z)");
  if (!/[0-9]/.test(password)) errors.push("one number (0–9)");
  if (!/[^A-Za-z0-9]/.test(password))
    errors.push("one special character (!@#$%^&* etc.)");

  if (errors.length > 0) {
    return {
      valid: false,
      message: `Password must contain: ${errors.join(", ")}.`,
    };
  }
  return { valid: true, message: "" };
}

export function passwordStrength(
  password: string,
): "empty" | "weak" | "fair" | "strong" {
  if (!password) return "empty";
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 10) score++;

  if (score <= 2) return "weak";
  if (score <= 3) return "fair";
  return "strong";
}

export function validateConfirmPassword(
  password: string,
  confirm: string,
): ValidationResult {
  if (!confirm)
    return { valid: false, message: "Please confirm your password." };
  if (password !== confirm)
    return { valid: false, message: "Passwords do not match." };
  return { valid: true, message: "" };
}

export function validateName(name: string): ValidationResult {
  if (!name.trim()) return { valid: false, message: "Full name is required." };
  if (name.trim().length < 2)
    return { valid: false, message: "Name must be at least 2 characters." };
  if (name.trim().length > 80)
    return { valid: false, message: "Name must be under 80 characters." };
  return { valid: true, message: "" };
}

export function validateWhatsApp(number: string): ValidationResult {
  if (!number.trim())
    return { valid: false, message: "WhatsApp number is required." };
  const cleaned = number.replace(/\s+/g, "");
  if (!/^\d{8,15}$/.test(cleaned)) {
    return {
      valid: false,
      message:
        "Enter country code + number, digits only, no spaces or symbols (8–15 digits total). Example: 919440667351",
    };
  }
  return { valid: true, message: "" };
}

export function validatePhone(phone: string): ValidationResult {
  if (!phone.trim()) return { valid: true, message: "" };
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (!/^\+?\d{7,15}$/.test(cleaned)) {
    return {
      valid: false,
      message: "Enter a valid phone number (7–15 digits, optional leading +).",
    };
  }
  return { valid: true, message: "" };
}

export function validateHabitName(name: string): ValidationResult {
  if (!name.trim()) return { valid: false, message: "Habit name is required." };
  if (name.trim().length < 2)
    return {
      valid: false,
      message: "Habit name must be at least 2 characters.",
    };
  if (name.trim().length > 60)
    return { valid: false, message: "Habit name must be under 60 characters." };
  return { valid: true, message: "" };
}

export function validateHabitDescription(desc: string): ValidationResult {
  if (desc.length > 200)
    return {
      valid: false,
      message: "Description must be under 200 characters.",
    };
  return { valid: true, message: "" };
}

export function validateTargetValue(value: number | string): ValidationResult {
  const n = Number(value);
  if (isNaN(n) || n < 1)
    return { valid: false, message: "Target must be at least 1." };
  if (n > 10000)
    return { valid: false, message: "Target must be under 10,000." };
  return { valid: true, message: "" };
}

export function validateReminderTime(
  time: string,
  enabled: boolean,
): ValidationResult {
  if (!enabled) return { valid: true, message: "" };
  if (!time)
    return {
      valid: false,
      message: "Reminder time is required when reminders are enabled.",
    };
  if (!/^\d{2}:\d{2}$/.test(time))
    return { valid: false, message: "Enter a valid time (HH:MM)." };
  return { valid: true, message: "" };
}
