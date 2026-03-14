'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/Layout';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';

const COLORS = ['#1D9E75', '#7F77DD', '#E8883A', '#E24B4A', '#3B8BD4'];

export default function AnalyticsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any>({});
  const [overview, setOverview] = useState<any>(null);
  const [habits, setHabits] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!token) { router.push('/login'); return; }

    const fetchAll = async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const today = new Date();

        const [daily, weekly, heatmap, ov, habitsData] = await Promise.all([
          api.analytics.getDaily(
            thirtyDaysAgo.toISOString().split('T')[0],
            today.toISOString().split('T')[0]
          ),
          api.analytics.getWeekly(
            thirtyDaysAgo.toISOString().split('T')[0],
            today.toISOString().split('T')[0]
          ),
          api.analytics.getHeatmap(today.getFullYear()),
          api.analytics.getOverview(),
          api.habits.getAll(),
        ]);

        setDailyData(daily);
        setWeeklyData(weekly);
        setHeatmapData(heatmap);
        setOverview(ov);
        setHabits(habitsData);
      } catch (e) {
        console.error('Failed to fetch analytics:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [token, router]);

  // Build per-habit completion data for pie chart
  const categoryData = habits.reduce((acc: any[], h: any) => {
    const existing = acc.find(a => a.name === h.category);
    if (existing) {
      existing.value += h.stats?.totalCompletions || 0;
    } else {
      acc.push({ name: h.category, value: h.stats?.totalCompletions || 0 });
    }
    return acc;
  }, []);

  const habitBarData = habits.map((h: any) => ({
    name: h.name,
    completionRate: h.stats?.completionRate || 0,
    streak: h.stats?.currentStreak || 0,
    total: h.stats?.totalCompletions || 0,
  }));

  const radarData = habits.map((h: any) => ({
    habit: h.name,
    streak: Math.min((h.stats?.currentStreak || 0) * 10, 100),
    completionRate: h.stats?.completionRate || 0,
    consistency: Math.min((h.stats?.totalCompletions || 0) * 5, 100),
  }));

  const statCards = [
    { label: 'Completion Rate', value: `${overview?.completionRate ?? 0}%`, tag: 'Last 30 days', color: '#1D9E75' },
    { label: 'Recent Completions', value: overview?.recentCompletions ?? 0, tag: 'This month', color: '#7F77DD' },
    { label: 'Active Habits', value: overview?.totalHabits ?? 0, tag: 'Being tracked', color: '#3B8BD4' },
    { label: 'Milestones', value: overview?.milestoneReached ?? 0, tag: 'Achieved', color: '#E8883A' },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track your progress over time</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map(s => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {s.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <p className="text-sm text-muted-foreground mt-1">{s.tag}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Area chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Trend</CardTitle>
                  <CardDescription>Completions over last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  {dailyData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={dailyData}>
                        <defs>
                          <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="completed" stroke="#1D9E75" fill="url(#colorComp)" name="Completed" />
                        <Area type="monotone" dataKey="total" stroke="#e5e7eb" fill="transparent" name="Total" strokeDasharray="4 2" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Pie chart — by category */}
              <Card>
                <CardHeader>
                  <CardTitle>Completions by Category</CardTitle>
                  <CardDescription>Total completions per habit category</CardDescription>
                </CardHeader>
                <CardContent>
                  {categoryData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                          dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}>
                          {categoryData.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Per-habit bar chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Per-Habit Completion Rate</CardTitle>
                  <CardDescription>How consistent you are with each habit</CardDescription>
                </CardHeader>
                <CardContent>
                  {habitBarData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No habits yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={habitBarData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                        <Tooltip formatter={(v: any) => `${v}%`} />
                        <Bar dataKey="completionRate" name="Completion Rate" radius={[0, 4, 4, 0]}>
                          {habitBarData.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Radar chart — habit health */}
              <Card>
                <CardHeader>
                  <CardTitle>Habit Health Radar</CardTitle>
                  <CardDescription>Streak, completion rate, and consistency</CardDescription>
                </CardHeader>
                <CardContent>
                  {radarData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="habit" tick={{ fontSize: 11 }} />
                        <Radar name="Streak" dataKey="streak" stroke="#1D9E75" fill="#1D9E75" fillOpacity={0.3} />
                        <Radar name="Completion %" dataKey="completionRate" stroke="#7F77DD" fill="#7F77DD" fillOpacity={0.3} />
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Streak leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle>Streak Leaderboard</CardTitle>
                <CardDescription>Current streaks across all habits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {habits.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No habits yet</p>
                  ) : (
                    [...habits]
                      .sort((a, b) => (b.stats?.currentStreak || 0) - (a.stats?.currentStreak || 0))
                      .map((h: any, i: number) => {
                        const maxStreak = Math.max(...habits.map((x: any) => x.stats?.currentStreak || 0), 1);
                        const pct = Math.round(((h.stats?.currentStreak || 0) / maxStreak) * 100);
                        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                        return (
                          <div key={h._id}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm">{medal} {h.name}</span>
                              <span className="text-sm font-medium">{h.stats?.currentStreak || 0} days 🔥</span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DAILY TAB */}
          <TabsContent value="daily" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Completion Rate</CardTitle>
                <CardDescription>Last 30 days of habit completions</CardDescription>
              </CardHeader>
              <CardContent>
                {dailyData.length === 0 ? (
                  <div className="h-96 flex items-center justify-center text-muted-foreground">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="completed" stroke="#1D9E75" name="Completed" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="total" stroke="#e5e7eb" name="Total" dot={false} strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* WEEKLY TAB */}
          <TabsContent value="weekly" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Completion Rate</CardTitle>
                <CardDescription>Completion rate by week</CardDescription>
              </CardHeader>
              <CardContent>
                {weeklyData.length === 0 ? (
                  <div className="h-96 flex items-center justify-center text-muted-foreground">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis unit="%" />
                      <Tooltip formatter={(v: any) => `${v}%`} />
                      <Legend />
                      <Bar dataKey="rate" fill="#1D9E75" name="Completion Rate (%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* HEATMAP TAB */}
          <TabsContent value="heatmap" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Contribution Heatmap</CardTitle>
                <CardDescription>Your habit completion activity for the year</CardDescription>
              </CardHeader>
              <CardContent>
                <HeatmapComponent data={heatmapData} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function HeatmapComponent({ data }: { data: any }) {
  const startDate = new Date(new Date().getFullYear(), 0, 1);
  const endDate = new Date(new Date().getFullYear(), 11, 31);
  const days: string[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().split('T')[0]);
  }
  const getIntensity = (date: string) => {
    const count = data[date] || 0;
    if (count === 0) return 'bg-muted';
    if (count === 1) return 'bg-green-200 dark:bg-green-900';
    if (count === 2) return 'bg-green-400 dark:bg-green-700';
    if (count === 3) return 'bg-green-600 dark:bg-green-600';
    return 'bg-green-700 dark:bg-green-500';
  };
  return (
    <div className="overflow-x-auto">
      <div className="inline-block p-4">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.ceil(days.length / 7)}, 13px)` }}>
          {days.map(date => (
            <div key={date} className={`w-3 h-3 rounded-sm ${getIntensity(date)}`}
              title={`${date}: ${data[date] || 0} habits completed`} />
          ))}
        </div>
      </div>
      <div className="flex gap-2 mt-4 text-xs text-muted-foreground items-center">
        <span>Less</span>
        {['bg-muted', 'bg-green-200 dark:bg-green-900', 'bg-green-400 dark:bg-green-700', 'bg-green-600', 'bg-green-700 dark:bg-green-500'].map((c, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}