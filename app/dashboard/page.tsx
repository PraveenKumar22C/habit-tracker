"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useHabitStore, useAnalyticsStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Layout from "@/components/Layout";
import HabitCard from "@/components/HabitCard";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

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

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-4 w-40 bg-muted rounded-full animate-pulse" />
        <div className="h-3 w-28 bg-muted rounded-full animate-pulse mt-1" />
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full bg-muted rounded-lg animate-pulse" />
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
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [habitBarData, setHabitBarData] = useState<any[]>([]);
  const [todayCompleted, setTodayCompleted] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date();

      const [habitsData, analyticsData, userData, dailyAnalytics] =
        await Promise.all([
          api.habits.getAll(),
          api.analytics.getOverview(),
          api.auth.me(),
          api.analytics.getDaily(
            thirtyDaysAgo.toISOString().split("T")[0],
            today.toISOString().split("T")[0],
          ),
        ]);

      setUser(userData);
      setHabits(habitsData);
      setStats({
        completionRate: analyticsData.completionRate,
        totalHabits: analyticsData.totalHabits,
        recentCompletions: analyticsData.recentCompletions,
        milestonesReached: analyticsData.milestoneReached,
      });

      setDailyData(dailyAnalytics.slice(-14));

      setHabitBarData(
        habitsData.map((h: any) => ({
          name: h.name.length > 10 ? h.name.slice(0, 10) + "…" : h.name,
          rate: h.stats?.completionRate || 0,
          color: h.color || "#3b82f6",
        })),
      );

      const todayStr = today.toISOString().split("T")[0];
      const todayEntry = dailyAnalytics.find((d: any) => d.date === todayStr);
      setTodayCompleted(todayEntry?.completed || 0);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setDataLoading(false);
    }
  }, [setUser, setHabits, setStats]);

  useEffect(() => {
    if (!_hydrated) return;
    if (!token) { router.push("/login"); return; }
    fetchData();
  }, [_hydrated, token, router, fetchData]);

  const handleCheckinSuccess = useCallback(async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date();

      const [habitsData, analyticsData, userData, dailyAnalytics] =
        await Promise.all([
          api.habits.getAll(),
          api.analytics.getOverview(),
          api.auth.me(),
          api.analytics.getDaily(
            thirtyDaysAgo.toISOString().split("T")[0],
            today.toISOString().split("T")[0],
          ),
        ]);

      setUser(userData);
      setHabits(habitsData);
      setStats({
        completionRate: analyticsData.completionRate,
        totalHabits: analyticsData.totalHabits,
        recentCompletions: analyticsData.recentCompletions,
        milestonesReached: analyticsData.milestoneReached,
      });
      setDailyData(dailyAnalytics.slice(-14));
      setHabitBarData(
        habitsData.map((h: any) => ({
          name: h.name.length > 10 ? h.name.slice(0, 10) + "…" : h.name,
          rate: h.stats?.completionRate || 0,
          color: h.color || "#3b82f6",
        })),
      );
      const todayStr = today.toISOString().split("T")[0];
      const todayEntry = dailyAnalytics.find((d: any) => d.date === todayStr);
      setTodayCompleted(todayEntry?.completed || 0);
    } catch (err) {
      console.error("Failed to refresh after check-in:", err);
    }
  }, [setUser, setHabits, setStats]);

  if (!_hydrated) return null;

  const activeHabits = habits.filter((h) => h.isActive);
  const todayPct =
    activeHabits.length > 0
      ? Math.round((todayCompleted / activeHabits.length) * 100)
      : 0;

  const statCards = [
    {
      label: "Active Habits",
      value: totalHabits,
      suffix: "being tracked",
      valueClass: "text-primary stat-number",
      icon: "🎯",
    },
    {
      label: "Completion Rate",
      value: `${completionRate}%`,
      suffix: "last 30 days",
      valueClass: "text-accent stat-number",
      icon: "📈",
    },
    {
      label: "Current Streak",
      value: user?.stats.currentStreak ?? 0,
      suffix: "days in a row 🔥",
      valueClass: "text-orange-500 stat-number",
      icon: "🔥",
    },
    {
      label: "Best Streak",
      value: user?.stats.longestStreak ?? 0,
      suffix: "all-time record",
      valueClass: "text-secondary stat-number",
      icon: "🏆",
    },
  ];

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8 page-enter">
        <div className="space-y-2 pb-1">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
            Welcome back,{" "}
            {dataLoading ? (
              <span className="inline-block h-9 sm:h-11 w-32 sm:w-36 bg-muted rounded-lg animate-pulse align-middle" />
            ) : (
              <span className="shimmer-text">
                {user?.name ?? "there"}!
              </span>
            )}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground font-medium">
            Track your progress and celebrate your wins
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {dataLoading
            ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            : statCards.map((s, i) => (
                <Card
                  key={s.label}
                  className="hover:shadow-lg transition-all duration-300 group relative overflow-hidden cursor-default"
                  style={{ animation: `slideInUp 0.4s ease ${i * 0.08}s both` }}
                >
                  <div className="absolute top-3 right-3 text-2xl opacity-20 group-hover:opacity-40 transition-opacity">
                    {s.icon}
                  </div>
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {s.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className={`text-3xl sm:text-4xl font-bold ${s.valueClass} mb-1`}>
                      {s.value}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">{s.suffix}</p>
                  </CardContent>
                </Card>
              ))}
        </div>

        <div className="flex gap-2 sm:gap-3 flex-wrap">
          <Link href="/habits/new">
            <Button className="bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-200 text-sm sm:text-base">
              + Add New Habit
            </Button>
          </Link>
          <Link href="/analytics">
            <Button
              variant="outline"
              className="font-semibold hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all duration-200 text-sm sm:text-base"
            >
              View Analytics
            </Button>
          </Link>
          <Link href="/settings">
            <Button
              variant="outline"
              className="font-semibold hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all duration-200 text-sm sm:text-base"
            >
              Settings
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Today's Overview
          </h2>

          {dataLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <ChartSkeleton /><ChartSkeleton /><ChartSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Card className="flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Today's Progress
                  </CardTitle>
                  <CardDescription>
                    {todayCompleted} of {activeHabits.length} habits done
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-4xl sm:text-5xl font-bold text-primary stat-number">
                      {todayPct}%
                    </span>
                    <span className="text-4xl">
                      {todayPct === 100 ? "🎉" : todayPct >= 50 ? "💪" : "🎯"}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full progress-fill"
                      style={{
                        width: `${todayPct}%`,
                        background: "linear-gradient(90deg, #a855f7, #3b82f6)",
                        boxShadow: todayPct > 0 ? "0 0 8px #a855f740" : "none",
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {todayPct === 100
                      ? "All habits completed! Amazing work 🔥"
                      : todayPct === 0
                        ? "Start checking in your habits!"
                        : `${activeHabits.length - todayCompleted} habit${activeHabits.length - todayCompleted !== 1 ? "s" : ""} remaining`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    14-Day Trend
                  </CardTitle>
                  <CardDescription>Daily completions</CardDescription>
                </CardHeader>
                <CardContent>
                  {dailyData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                      No data yet — start checking in!
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={192}>
                      <AreaChart data={dailyData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                        <defs>
                          <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(5)} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                        <Tooltip formatter={(v: any) => [v, "Completed"]} labelFormatter={(l) => `Date: ${l}`} />
                        <Area type="monotone" dataKey="completed" stroke="#a855f7" strokeWidth={2} fill="url(#dashGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Habit Completion Rates
                  </CardTitle>
                  <CardDescription>All-time per habit</CardDescription>
                </CardHeader>
                <CardContent>
                  {habitBarData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                      No habits yet
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={192}>
                      <BarChart data={habitBarData} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} unit="%" />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={68} />
                        <Tooltip formatter={(v: any) => [`${v}%`, "Rate"]} />
                        <Bar dataKey="rate" radius={[0, 4, 4, 0]} name="Completion Rate">
                          {habitBarData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="space-y-4 sm:space-y-5">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Today's Habits
            </h2>
            {!dataLoading && habits.length > 0 && (
              <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                {habits.length} active
              </span>
            )}
          </div>

          {dataLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {Array.from({ length: 3 }).map((_, i) => <HabitCardSkeleton key={i} />)}
            </div>
          ) : habits.length === 0 ? (
            <Card className="text-center py-12 sm:py-16 border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors">
              <CardContent className="space-y-4">
                <div className="text-5xl sm:text-6xl mb-2">🎯</div>
                <p className="text-base sm:text-lg text-muted-foreground">
                  No habits yet. Start building today!
                </p>
                <Link href="/habits/new">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                    Create Your First Habit
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {habits.map((habit, i) => (
                <div key={habit._id} style={{ animation: `slideInUp 0.35s ease ${i * 0.07}s both` }}>
                  <HabitCard habit={habit} onCheckinSuccess={handleCheckinSuccess} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
