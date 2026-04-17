"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore, useHabitStore, useAnalyticsStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/Layout";
import HabitCard from "@/components/HabitCard";
import { Plus, Activity } from "lucide-react";

function HabitCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 bg-muted rounded-full animate-pulse" />
            <div className="h-2.5 w-20 bg-muted rounded-full animate-pulse" />
          </div>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full animate-pulse" />
        <div className="h-8 w-full bg-muted rounded-lg animate-pulse" />
      </CardContent>
    </Card>
  );
}

export default function HabitsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { habits, setHabits, loading } = useHabitStore();
  const { setStats } = useAnalyticsStore();

  const fetchHabits = useCallback(async () => {
    try {
      const data = await api.habits.getAll();
      setHabits(data);
    } catch (error) {
      console.error("Failed to fetch habits:", error);
    }
  }, [setHabits]);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    fetchHabits();
  }, [token, router, fetchHabits]);

  const handleCheckinSuccess = useCallback(async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date();

      const [habitsData, analyticsData] = await Promise.all([
        api.habits.getAll(),
        api.analytics.getOverview(),
        api.analytics.getDaily(
          thirtyDaysAgo.toISOString().split("T")[0],
          today.toISOString().split("T")[0],
        ),
      ]);

      setHabits(habitsData);
      setStats({
        completionRate: analyticsData.completionRate,
        totalHabits: analyticsData.totalHabits,
        recentCompletions: analyticsData.recentCompletions,
        milestonesReached: analyticsData.milestoneReached,
      });
    } catch (err) {
      console.error("Failed to refresh after check-in:", err);
    }
  }, [setHabits, setStats]);

  const activeHabits = habits.filter((h) => h.isActive);
  const inactiveHabits = habits.filter((h) => !h.isActive);

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8 page-enter">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              My Habits
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage and track all your habits
            </p>
          </div>
          <Link href="/habits/new" className="self-start sm:self-auto">
            <Button className="bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-200 flex items-center gap-2">
              <Plus size={16} />
              Add New Habit
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Activity size={20} className="text-primary" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Active Habits</h2>
              <p className="text-sm text-muted-foreground">
                {loading
                  ? "Loading…"
                  : `${activeHabits.length} habit${activeHabits.length !== 1 ? "s" : ""} being tracked`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <HabitCardSkeleton key={i} />
              ))}
            </div>
          ) : activeHabits.length === 0 ? (
            <Card className="border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors">
              <CardContent className="pt-10 pb-10 text-center space-y-4">
                <div className="text-5xl mb-2">🎯</div>
                <p className="text-muted-foreground">No active habits yet</p>
                <Link href="/habits/new">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                    Create Your First Habit
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {activeHabits.map((habit, i) => (
                <div
                  key={habit._id}
                  style={{ animation: `slideInUp 0.35s ease ${i * 0.07}s both` }}
                >
                  <HabitCard habit={habit} onCheckinSuccess={handleCheckinSuccess} />
                </div>
              ))}
            </div>
          )}
        </div>

        {!loading && inactiveHabits.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-muted-foreground">
                Paused Habits
              </h2>
              <p className="text-sm text-muted-foreground">
                {inactiveHabits.length} habit{inactiveHabits.length !== 1 ? "s" : ""} paused
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 opacity-60">
              {inactiveHabits.map((habit, i) => (
                <div
                  key={habit._id}
                  style={{ animation: `slideInUp 0.35s ease ${(activeHabits.length + i) * 0.07}s both` }}
                >
                  <HabitCard habit={habit} onCheckinSuccess={handleCheckinSuccess} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
