"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Loader2,
  Users,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
} from "lucide-react";

type UserSummary = {
  _id: string;
  name: string;
  email: string;
  whatsappNumber?: string;
};

type HabitSummary = {
  _id: string;
  name: string;
  reminder: { enabled: boolean; time: string };
  isActive: boolean;
};

export function ManualReminderTrigger() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [habits, setHabits] = useState<HabitSummary[]>([]);
  const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([]);
  const [reminderType, setReminderType] = useState<"normal" | "missed">(
    "normal",
  );
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingHabits, setLoadingHabits] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const selectedUser = useMemo(
    () => users.find((u) => u._id === selectedUserId),
    [users, selectedUserId],
  );

  // Load all users (admin only)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingUsers(true);
      try {
        // You need to create this endpoint on backend
        const data = await api.get("/admin/users-summary"); // returns array of { _id, name, email, whatsappNumber? }
        if (mounted) setUsers(data || []);
      } catch (err) {
        console.error("Failed to load users", err);
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Load habits when user is selected
  useEffect(() => {
    if (!selectedUserId) {
      setHabits([]);
      setSelectedHabitIds([]);
      return;
    }

    let mounted = true;
    (async () => {
      setLoadingHabits(true);
      try {
        // You need to create this endpoint too (admin sees any user's habits)
        const data = await api.get(`/admin/users/${selectedUserId}/habits`);
        if (mounted) {
          const activeWithReminder = (data || []).filter(
            (h: HabitSummary) => h.isActive && h.reminder?.enabled,
          );
          setHabits(activeWithReminder);
          setSelectedHabitIds(
            activeWithReminder.map((h: HabitSummary) => h._id),
          );
        }
      } catch (err) {
        console.error("Failed to load habits", err);
        if (mounted) setHabits([]);
      } finally {
        if (mounted) setLoadingHabits(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedUserId]);

  const handleSend = async () => {
    if (!selectedUserId || selectedHabitIds.length === 0) return;

    setSending(true);
    setResult(null);

    try {
      const payload = {
        userId: selectedUserId,
        habitIds: selectedHabitIds,
        type: reminderType, // "normal" | "missed"
        force: true, // bypass time window checks
      };

      // You need to create this endpoint
      const res = await api.post("/admin/reminders/manual-trigger", payload);

      setResult({
        success: true,
        message:
          `Reminder${selectedHabitIds.length > 1 ? "s" : ""} sent! ` +
          `(WA: ${res.whatsappSent || 0}, Email: ${res.emailSent || 0})`,
      });
    } catch (err: any) {
      setResult({
        success: false,
        message: err?.error || "Failed to send reminder(s)",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 pt-2">
      {/* 1. User search */}
      <div className="space-y-2">
        <Label>Select user</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between text-left font-normal"
              disabled={loadingUsers}
            >
              {selectedUser ? (
                <span className="truncate">
                  {selectedUser.name} — {selectedUser.email}
                </span>
              ) : (
                <span className="text-muted-foreground">Search user...</span>
              )}
              <Users className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
            <Command>
              <CommandInput placeholder="Search name or email..." />
              <CommandList>
                <CommandEmpty>No users found.</CommandEmpty>
                <CommandGroup>
                  {users.map((u) => (
                    <CommandItem
                      key={u._id}
                      value={`${u.name} ${u.email}`}
                      onSelect={() => setSelectedUserId(u._id)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{u.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {u.email}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* 2. Habits list (only after user selected) */}
      {selectedUserId && (
        <>
          {loadingHabits ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : habits.length === 0 ? (
            <Card className="bg-amber-50/40 dark:bg-amber-950/30 border-amber-200">
              <CardContent className="py-6 text-center text-sm text-amber-800 dark:text-amber-300">
                No active habits with reminders enabled for this user.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Habits to remind ({habits.length})</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    setSelectedHabitIds(
                      selectedHabitIds.length === habits.length
                        ? []
                        : habits.map((h) => h._id),
                    )
                  }
                >
                  {selectedHabitIds.length === habits.length
                    ? "Deselect all"
                    : "Select all"}
                </Button>
              </div>

              <div className="max-h-60 overflow-y-auto border border-border rounded-md">
                {habits.map((habit) => (
                  <div
                    key={habit._id}
                    className="flex items-center space-x-3 px-4 py-3 hover:bg-muted/50 border-b last:border-b-0"
                  >
                    <Checkbox
                      id={`habit-${habit._id}`}
                      checked={selectedHabitIds.includes(habit._id)}
                      onCheckedChange={(checked) => {
                        setSelectedHabitIds((prev) =>
                          checked
                            ? [...prev, habit._id]
                            : prev.filter((id) => id !== habit._id),
                        );
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={`habit-${habit._id}`}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {habit.name}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Reminder at {habit.reminder.time}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {habit.reminder.time}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Reminder type + Send button */}
          {habits.length > 0 && selectedHabitIds.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Reminder style</Label>
                <RadioGroup
                  value={reminderType}
                  onValueChange={(v) =>
                    setReminderType(v as "normal" | "missed")
                  }
                  className="grid grid-cols-2 gap-4"
                >
                  <div
                    className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setReminderType("normal")}
                  >
                    <RadioGroupItem value="normal" id="normal" />
                    <Label htmlFor="normal" className="cursor-pointer flex-1">
                      <div className="font-medium">Normal (on-time)</div>
                      <div className="text-xs text-muted-foreground">
                        Regular daily reminder
                      </div>
                    </Label>
                  </div>

                  <div
                    className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:border-amber-500/50 transition-colors"
                    onClick={() => setReminderType("missed")}
                  >
                    <RadioGroupItem value="missed" id="missed" />
                    <Label htmlFor="missed" className="cursor-pointer flex-1">
                      <div className="font-medium flex items-center gap-1.5">
                        Missed
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        "You missed it — still time!"
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                onClick={handleSend}
                disabled={sending || selectedHabitIds.length === 0}
                className="w-full"
                variant={reminderType === "missed" ? "destructive" : "default"}
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send{" "}
                    {selectedHabitIds.length === 1
                      ? "reminder"
                      : `${selectedHabitIds.length} reminders`}
                    {reminderType === "missed" ? " (missed style)" : ""}
                  </>
                )}
              </Button>

              {result && (
                <div
                  className={`p-3 rounded-lg text-sm border ${
                    result.success
                      ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/40 dark:border-green-800 dark:text-green-300"
                      : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300"
                  }`}
                >
                  {result.message}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
