"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useHabitStore, useAnalyticsStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Layout from "@/components/Layout";
import HabitCard from "@/components/HabitCard";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, setUser } = useAuthStore();
  const { habits, setHabits, loading } = useHabitStore();
  const { completionRate, totalHabits, setStats } = useAnalyticsStore();
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [habitsData, analyticsData, userData] = await Promise.all([
          api.habits.getAll(),
          api.analytics.getOverview(),
          api.auth.me(), 
        ]);

        setUser(userData); 
        setHabits(habitsData);
        setStats({
          completionRate: analyticsData.completionRate,
          totalHabits: analyticsData.totalHabits,
          recentCompletions: analyticsData.recentCompletions,
          milestonesReached: analyticsData.milestoneReached,
        });
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchData();
  }, [token, router]);

  return (
    <Layout>
      <div className="space-y-8">
        <div className="space-y-3 pb-2">
          <h1 className="text-5xl font-bold text-foreground">
            Welcome back,{" "}
            <span
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #a855f7 0%, #6366f1 25%, #3b82f6 50%, #06b6d4 75%, #a855f7 100%)",
                backgroundSize: "200% auto",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
                animation: "shimmer 3s linear infinite",
                display: "inline-block",
              }}
            >
              {user?.name ?? "there"}!
            </span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Track your progress and celebrate your wins
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-all group relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-2 relative">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active Habits
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-4xl font-bold text-primary mb-2">
                {totalHabits}
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                habits being tracked
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all group relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-2 relative">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-4xl font-bold text-accent mb-2">
                {completionRate}%
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                last 30 days
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all group relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-2 relative">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-4xl font-bold text-orange-500 mb-2">
                {user?.stats.currentStreak || 0}
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                days in a row 🔥
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all group relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-2 relative">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Best Streak
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-4xl font-bold text-secondary mb-2">
                {user?.stats.longestStreak || 0}
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                all time record
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3 flex-wrap pt-4">
          <Link href="/habits/new">
            <Button className="bg-linear-to-r from-primary to-secondary text-white font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all">
              + Add New Habit
            </Button>
          </Link>
          <Link href="/analytics">
            <Button
              variant="outline"
              className="font-semibold hover:bg-secondary/10 hover:text-secondary transition-colors"
            >
              View Analytics
            </Button>
          </Link>
          <Link href="/settings">
            <Button
              variant="outline"
              className="font-semibold hover:bg-accent/10 hover:text-accent transition-colors"
            >
              Settings
            </Button>
          </Link>
        </div>

        <div className="space-y-5">
          <div className="flex justify-between items-center pt-4">
            <h2 className="text-3xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              Today's Habits
            </h2>
            {habits.length > 0 && (
              <span className="px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold">
                {habits.length} active
              </span>
            )}
          </div>

          {habits.length === 0 ? (
            <Card className="text-center py-16 border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors">
              <CardContent className="space-y-4">
                <div className="text-6xl mb-2">🎯</div>
                <p className="text-lg text-muted-foreground">
                  No habits yet. Start building today!
                </p>
                <Link href="/habits/new">
                  <Button className="bg-primary hover:bg-primary/90 text-white font-semibold">
                    Create Your First Habit
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {habits.map((habit) => (
                <HabitCard key={habit._id} habit={habit} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
