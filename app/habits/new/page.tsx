"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import { useHabitStore, useAuthStore } from "@/lib/store";
import Layout from "@/components/Layout";
import Link from "next/link";
import {
  validateHabitName,
  validateHabitDescription,
  validateTargetValue,
  validateReminderTime,
  validateWhatsApp,
} from "@/lib/validations";
import { MessageCircle, AlertCircle } from "lucide-react";
import { FieldError } from "@/components/Fielderror";

const CATEGORIES = [
  "health",
  "fitness",
  "learning",
  "productivity",
  "mindfulness",
  "social",
  "other",
];
const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

export default function NewHabitPage() {
  const router = useRouter();
  const { addHabit } = useHabitStore();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "health",
    color: "#3b82f6",
    frequency: "daily",
    targetValue: 1,
    targetUnit: "times",
    reminderEnabled: false,
    reminderTime: "09:00",
  });

  const [whatsappInput, setWhatsappInput] = useState(
    user?.whatsappNumber || "",
  );
  const [saveWhatsapp, setSaveWhatsapp] = useState(false);

  type FieldKey =
    | "name"
    | "description"
    | "targetValue"
    | "reminderTime"
    | "whatsapp";
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>(
    {},
  );

  const validateField = (field: FieldKey, value?: any): string => {
    switch (field) {
      case "name":
        return validateHabitName(formData.name).message;
      case "description":
        return validateHabitDescription(formData.description).message;
      case "targetValue":
        return validateTargetValue(formData.targetValue).message;
      case "reminderTime":
        return validateReminderTime(
          formData.reminderTime,
          formData.reminderEnabled,
        ).message;
      case "whatsapp":
        if (!formData.reminderEnabled) return "";
        return validateWhatsApp(whatsappInput).message;
      default:
        return "";
    }
  };

  const handleBlur = (field: FieldKey) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((e) => ({ ...e, [field]: validateField(field) }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const newVal =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: newVal }));

    if (touched[name as FieldKey]) {
      setTimeout(() => {
        setErrors((err) => ({
          ...err,
          [name]: validateField(name as FieldKey),
        }));
      }, 0);
    }
  };

  const validateAll = (): boolean => {
    const fields: FieldKey[] = [
      "name",
      "description",
      "targetValue",
      "reminderTime",
      "whatsapp",
    ];
    const newErrors: Partial<Record<FieldKey, string>> = {};
    let valid = true;
    for (const f of fields) {
      const msg = validateField(f);
      if (msg) {
        newErrors[f] = msg;
        valid = false;
      }
    }
    setErrors(newErrors);
    setTouched({
      name: true,
      description: true,
      targetValue: true,
      reminderTime: true,
      whatsapp: true,
    });
    return valid;
  };

  const hasWhatsapp = !!user?.whatsappNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setLoading(true);

    try {
      if (
        formData.reminderEnabled &&
        !hasWhatsapp &&
        saveWhatsapp &&
        whatsappInput.trim()
      ) {
        const updatedUser = await api.auth.updateProfile({
          whatsappNumber: whatsappInput.trim(),
        });
        setUser(updatedUser);
      }

      const habitData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        color: formData.color,
        frequency: formData.frequency,
        target: {
          value: parseInt(String(formData.targetValue)),
          unit: formData.targetUnit,
        },
        reminder: {
          enabled: formData.reminderEnabled,
          time: formData.reminderTime,
        },
      };

      const response = await api.habits.create(habitData);
      addHabit(response);
      router.push("/habits");
    } catch (err: any) {
      setErrors((e) => ({
        ...e,
        name: err.error || "Failed to create habit. Please try again.",
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Create New Habit</h1>
          <p className="text-muted-foreground">Define a new habit to track</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Habit Details</CardTitle>
            <CardDescription>Fields marked with * are required</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Habit Name */}
              <div className="space-y-1">
                <label htmlFor="name" className="text-sm font-medium">
                  Habit Name *
                </label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Morning Exercise"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={() => handleBlur("name")}
                  maxLength={60}
                  className={
                    errors.name
                      ? "border-destructive focus:border-destructive"
                      : ""
                  }
                />
                <div className="flex justify-between items-center">
                  <FieldError message={errors.name} />
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formData.name.length}/60
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label htmlFor="description" className="text-sm font-medium">
                  Description{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <Input
                  id="description"
                  name="description"
                  placeholder="e.g., 30 minutes of running or gym workout"
                  value={formData.description}
                  onChange={handleChange}
                  onBlur={() => handleBlur("description")}
                  maxLength={200}
                  className={
                    errors.description
                      ? "border-destructive focus:border-destructive"
                      : ""
                  }
                />
                <div className="flex justify-between items-center">
                  <FieldError message={errors.description} />
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formData.description.length}/200
                  </span>
                </div>
              </div>

              {/* Category & Color */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="category" className="text-sm font-medium">
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Color *</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-10 h-10 rounded-lg border-2 transition-transform hover:scale-110 ${
                          formData.color === color
                            ? "border-foreground scale-110 shadow-lg"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, color }))
                        }
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Frequency */}
              <div className="space-y-2">
                <label htmlFor="frequency" className="text-sm font-medium">
                  Frequency *
                </label>
                <select
                  id="frequency"
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Target */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="targetValue" className="text-sm font-medium">
                    Target Value *
                  </label>
                  <Input
                    id="targetValue"
                    name="targetValue"
                    type="number"
                    min="1"
                    max="10000"
                    value={formData.targetValue}
                    onChange={handleChange}
                    onBlur={() => handleBlur("targetValue")}
                    className={
                      errors.targetValue
                        ? "border-destructive focus:border-destructive"
                        : ""
                    }
                  />
                  <FieldError message={errors.targetValue} />
                </div>

                <div className="space-y-2">
                  <label htmlFor="targetUnit" className="text-sm font-medium">
                    Unit *
                  </label>
                  <select
                    id="targetUnit"
                    name="targetUnit"
                    value={formData.targetUnit}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="times">Times</option>
                    <option value="hours">Hours</option>
                    <option value="minutes">Minutes</option>
                    <option value="km">KM</option>
                    <option value="pages">Pages</option>
                    <option value="items">Items</option>
                  </select>
                </div>
              </div>

              {/* Reminder Section */}
              <div className="space-y-4 p-4 bg-muted rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <input
                    id="reminderEnabled"
                    name="reminderEnabled"
                    type="checkbox"
                    checked={formData.reminderEnabled}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-border cursor-pointer"
                  />
                  <label
                    htmlFor="reminderEnabled"
                    className="text-sm font-semibold cursor-pointer flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4 text-green-500" />
                    Enable WhatsApp Reminder
                  </label>
                </div>

                {formData.reminderEnabled && (
                  <div className="space-y-4 pl-6 border-l-2 border-green-500/30">
                    {/* Reminder Time */}
                    <div className="space-y-1">
                      <label
                        htmlFor="reminderTime"
                        className="text-sm font-medium"
                      >
                        Reminder Time *
                      </label>
                      <Input
                        id="reminderTime"
                        name="reminderTime"
                        type="time"
                        value={formData.reminderTime}
                        onChange={handleChange}
                        onBlur={() => handleBlur("reminderTime")}
                        className={
                          errors.reminderTime
                            ? "border-destructive focus:border-destructive"
                            : ""
                        }
                      />
                      <FieldError message={errors.reminderTime} />
                    </div>

                    {/* WhatsApp Number */}
                    {hasWhatsapp ? (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                          <MessageCircle className="w-4 h-4" />
                          Reminders will be sent to:{" "}
                          <strong>{user?.whatsappNumber}</strong>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          You can update your number in Settings → Profile.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                          <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            No WhatsApp number found on your account.
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Enter your number below to receive reminders. You
                            can also add it later in Settings.
                          </p>
                        </div>

                        <div className="space-y-1">
                          <label
                            htmlFor="whatsappInput"
                            className="text-sm font-medium"
                          >
                            WhatsApp Number *
                          </label>
                          <Input
                            id="whatsappInput"
                            placeholder="e.g. 919440667351 (country code + number)"
                            value={whatsappInput}
                            onChange={(e) => {
                              setWhatsappInput(e.target.value);
                              if (touched.whatsapp) {
                                const r = validateWhatsApp(e.target.value);
                                setErrors((err) => ({
                                  ...err,
                                  whatsapp: r.valid ? "" : r.message,
                                }));
                              }
                            }}
                            onBlur={() => handleBlur("whatsapp")}
                            className={
                              errors.whatsapp
                                ? "border-destructive focus:border-destructive"
                                : ""
                            }
                          />
                          <FieldError message={errors.whatsapp} />
                          <p className="text-xs text-muted-foreground">
                            Format: country code + phone number, no spaces or
                            symbols.
                            <br />
                            Example:{" "}
                            <code className="bg-muted px-1 rounded">
                              919440667351
                            </code>{" "}
                            (India +91),{" "}
                            <code className="bg-muted px-1 rounded">
                              14155238886
                            </code>{" "}
                            (US +1)
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            id="saveWhatsapp"
                            type="checkbox"
                            checked={saveWhatsapp}
                            onChange={(e) => setSaveWhatsapp(e.target.checked)}
                            className="w-4 h-4 rounded border-border cursor-pointer"
                          />
                          <label
                            htmlFor="saveWhatsapp"
                            className="text-sm cursor-pointer text-muted-foreground"
                          >
                            Save this number to my profile
                          </label>
                        </div>

                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <p className="text-xs text-blue-700 dark:text-blue-400">
                            <strong>First-time setup:</strong> Send{" "}
                            <code className="bg-muted px-1 rounded">
                              join scientific-lungs
                            </code>{" "}
                            to <strong>+14155238886</strong> on WhatsApp to opt
                            in to the sandbox.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Creating…" : "Create Habit"}
                </Button>
                <Link href="/habits" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
