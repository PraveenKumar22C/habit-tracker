'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/Layout';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnalyticsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any>({});
  const [activeTab, setActiveTab] = useState('daily');

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchAnalytics = async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const today = new Date();

        const [daily, weekly, heatmap] = await Promise.all([
          api.analytics.getDaily(
            thirtyDaysAgo.toISOString().split('T')[0],
            today.toISOString().split('T')[0]
          ),
          api.analytics.getWeekly(
            thirtyDaysAgo.toISOString().split('T')[0],
            today.toISOString().split('T')[0]
          ),
          api.analytics.getHeatmap(today.getFullYear()),
        ]);

        setDailyData(daily);
        setWeeklyData(weekly);
        setHeatmapData(heatmap);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [token, router]);

  return (
    <Layout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track your progress over time</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="daily">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Completion Rate</CardTitle>
                <CardDescription>Last 30 days of habit completions</CardDescription>
              </CardHeader>
              <CardContent>
                {dailyData.length === 0 ? (
                  <div className="h-96 flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="completed" 
                        stroke="#3b82f6" 
                        name="Completed"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#e5e7eb" 
                        name="Total"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Completion Rate</CardTitle>
                <CardDescription>Completion rate by week</CardDescription>
              </CardHeader>
              <CardContent>
                {weeklyData.length === 0 ? (
                  <div className="h-96 flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar 
                        dataKey="rate" 
                        fill="#3b82f6" 
                        name="Completion Rate (%)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="heatmap" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>GitHub-style Contribution Heatmap</CardTitle>
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
  const days: (string | null)[] = [];
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    days.push(dateStr);
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
          {days.map((date) => (
            date && (
              <div
                key={date}
                className={`w-3 h-3 rounded-sm ${getIntensity(date)}`}
                title={`${date}: ${data[date] || 0} habits completed`}
              />
            )
          ))}
        </div>
      </div>
      <div className="flex gap-2 mt-4 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 bg-muted rounded-sm" />
          <div className="w-3 h-3 bg-green-200 dark:bg-green-900 rounded-sm" />
          <div className="w-3 h-3 bg-green-400 dark:bg-green-700 rounded-sm" />
          <div className="w-3 h-3 bg-green-600 dark:bg-green-600 rounded-sm" />
          <div className="w-3 h-3 bg-green-700 dark:bg-green-500 rounded-sm" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
