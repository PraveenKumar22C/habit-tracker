"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Habit } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useHabitStore, useAnalyticsStore, useAuthStore } from "@/lib/store";
import { Check, Flame, TrendingUp } from "lucide-react";
import { toLocalDateStr } from "@/lib/dateUtils";
import { StreakCelebration } from "@/components/StreakCelebration";

interface HabitCardProps {
  habit: Habit;
  onCheckinSuccess?: () => void;
}

export default function HabitCard({ habit, onCheckinSuccess }: HabitCardProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [checkedToday, setCheckedToday] = useState(false);
  const [showStreak, setShowStreak] = useState(false);
  const [celebrationStreak, setCelebrationStreak] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { updateHabit } = useHabitStore();
  const { setStats } = useAnalyticsStore();
  const { setUser } = useAuthStore();

  useEffect(() => {
    const checkTodayStatus = async () => {
      try {
        const logs = await api.habits.getLogs(habit._id);
        const todayStr = toLocalDateStr(new Date());
        const alreadyDone = logs.some(
          (l: any) =>
            toLocalDateStr(new Date(l.date)) === todayStr && l.completed,
        );
        setCheckedToday(alreadyDone);
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      }
    };
    checkTodayStatus();
  }, [habit._id]);

  const handleCheck = async () => {
    if (isChecking || checkedToday) return;
    setIsChecking(true);
    try {
      const todayStr = toLocalDateStr(new Date());
      const logResponse = await api.habits.log(habit._id, {
        date: todayStr,
        completed: true,
        value: 1,
      });

      if (logResponse.alreadyCompleted) {
        setCheckedToday(true);
        return;
      }

      setCheckedToday(true);

      // Fetch updated habit stats
      const updatedStats = await api.habits.getStats(habit._id);
      const newStreak = updatedStats.currentStreak;

      updateHabit({
        ...habit,
        stats: {
          ...habit.stats,
          currentStreak: newStreak,
          totalCompletions: updatedStats.totalCompletions,
          completionRate: updatedStats.completionRate,
          longestStreak: Math.max(habit.stats.longestStreak, newStreak),
        },
      });

      // Show streak celebration
      setCelebrationStreak(newStreak);
      setShowStreak(true);

      // Refresh analytics store + user stats in background
      try {
        const [analyticsData, userData] = await Promise.all([
          api.analytics.getOverview(),
          api.auth.me(),
        ]);
        setStats({
          completionRate: analyticsData.completionRate,
          totalHabits: analyticsData.totalHabits,
          recentCompletions: analyticsData.recentCompletions,
          milestonesReached: analyticsData.milestoneReached,
        });
        setUser(userData);
      } catch (_) {
        // analytics refresh is non-critical
      }

      // Notify parent page to refresh its data
      onCheckinSuccess?.();
    } catch (error) {
      console.error("Failed to log habit:", error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <>
      {showStreak && (
        <StreakCelebration
          streak={celebrationStreak}
          habitName={habit.name}
          onClose={() => setShowStreak(false)}
        />
      )}

      <div
        ref={cardRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          transform: isHovered ? "translateY(-4px) scale(1.01)" : "translateY(0) scale(1)",
          transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <Card
          className="overflow-hidden transition-shadow duration-300 group"
          style={{
            borderLeftColor: habit.color,
            borderLeftWidth: "4px",
            boxShadow: isHovered
              ? `0 20px 40px -8px ${habit.color}30, 0 8px 16px -4px rgba(0,0,0,0.15)`
              : "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base sm:text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent truncate">
                  {habit.name}
                </CardTitle>
                {habit.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {habit.description}
                  </p>
                )}
              </div>
              <span
                className="text-xs font-semibold px-2 py-1 rounded-lg whitespace-nowrap capitalize shrink-0"
                style={{
                  backgroundColor: habit.color + "20",
                  color: habit.color,
                }}
              >
                {habit.category}
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-xl">
              <div className="flex items-center gap-2">
                <Flame
                  className="w-5 h-5 text-orange-500"
                  style={{ animation: habit.stats.currentStreak > 0 ? "flamePulse 1.5s ease-in-out infinite" : "none" }}
                />
                <div>
                  <span className="text-xs text-muted-foreground block">Current Streak</span>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400 leading-none">
                    {habit.stats.currentStreak}
                    <span className="text-xs font-normal ml-1">days</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-right">
                <TrendingUp className="w-3 h-3 text-primary opacity-60" />
                <div>
                  <p className="text-xs text-muted-foreground">Best</p>
                  <p className="text-base font-bold text-primary leading-none">
                    {habit.stats.longestStreak}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground">Completion Rate</span>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-sm font-bold"
                  style={{
                    backgroundColor: habit.color + "20",
                    color: habit.color,
                  }}
                >
                  {habit.stats.completionRate}%
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(habit.stats.completionRate, 100)}%`,
                    backgroundColor: habit.color,
                    boxShadow: `0 0 10px ${habit.color}50`,
                    transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)",
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                className={`flex-1 font-semibold transition-all duration-200 ${
                  checkedToday
                    ? "bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-primary/30 hover:shadow-md"
                }`}
                disabled={isChecking || checkedToday}
                onClick={handleCheck}
                variant={checkedToday ? "outline" : "default"}
              >
                {isChecking ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 border-2 border-current border-t-transparent rounded-full"
                      style={{ animation: "spin 0.7s linear infinite" }}
                    />
                    Checking…
                  </span>
                ) : checkedToday ? (
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Done Today
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Check In
                  </span>
                )}
              </Button>

              <Link href={`/habits/${habit._id}`} className="flex-1">
                <Button
                  variant="outline"
                  className="w-full font-semibold hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all duration-200"
                >
                  Details
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
