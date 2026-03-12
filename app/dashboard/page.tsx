"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useHabitStore, useAnalyticsStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Layout from "@/components/Layout";
import HabitCard from "@/components/HabitCard";
import Link from "next/link";

function StatCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="h-2.5 w-24 bg-muted rounded-full animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-9 w-14 bg-muted rounded-lg animate-pulse mb-2" />
        <div className="h-2.5 w-28 bg-muted rounded-full animate-pulse" />
      </CardContent>
    </Card>
  );
}

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


export default function DashboardPage() {
  const router = useRouter();
  const { user, token, setUser, _hydrated } = useAuthStore();
  const { habits, setHabits } = useHabitStore();
  const { completionRate, totalHabits, setStats } = useAnalyticsStore();
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!_hydrated) return;

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
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [_hydrated, token, router, setUser, setHabits, setStats]);

  if (!_hydrated) return null;

  const statCards = [
    {
      label: "Active Habits",
      value: totalHabits,
      suffix: "habits being tracked",
      valueClass: "text-primary",
      gradientClass: "from-primary/5",
    },
    {
      label: "Completion Rate",
      value: `${completionRate}%`,
      suffix: "last 30 days",
      valueClass: "text-accent",
      gradientClass: "from-accent/5",
    },
    {
      label: "Current Streak",
      value: user?.stats.currentStreak ?? 0,
      suffix: "days in a row 🔥",
      valueClass: "text-orange-500",
      gradientClass: "from-orange-500/5",
    },
    {
      label: "Best Streak",
      value: user?.stats.longestStreak ?? 0,
      suffix: "all time record",
      valueClass: "text-secondary",
      gradientClass: "from-secondary/5",
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div className="space-y-3 pb-2">
          <h1 className="text-5xl font-bold text-foreground">
            Welcome back,{" "}
            {dataLoading ? (
              <span className="inline-block h-11 w-36 bg-muted rounded-lg animate-pulse align-middle" />
            ) : (
              <span
                style={{
                  backgroundImage:
                    "linear-gradient(90deg,#a855f7 0%,#6366f1 25%,#3b82f6 50%,#06b6d4 75%,#a855f7 100%)",
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
            )}
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Track your progress and celebrate your wins
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {dataLoading
            ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            : statCards.map((s) => (
                <Card
                  key={s.label}
                  className="hover:shadow-lg transition-all group relative overflow-hidden"
                >
                  <div
                    className={`absolute inset-0 bg-linear-to-br ${s.gradientClass} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}
                  />
                  <CardHeader className="pb-2 relative">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {s.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className={`text-4xl font-bold ${s.valueClass} mb-2`}>
                      {s.value}
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">{s.suffix}</p>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* ── Action buttons ── */}
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

        {/* ── Today's habits ── */}
        <div className="space-y-5">
          <div className="flex justify-between items-center pt-4">
            <h2 className="text-3xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              Today's Habits
            </h2>
            {!dataLoading && habits.length > 0 && (
              <span className="px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold">
                {habits.length} active
              </span>
            )}
          </div>

          {dataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <HabitCardSkeleton key={i} />
              ))}
            </div>
          ) : habits.length === 0 ? (
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