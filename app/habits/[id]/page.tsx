'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore, useHabitStore } from '@/lib/store';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import Layout from '@/components/Layout';
import { Flame, TrendingUp, Calendar, Edit2, Trash2, Zap, X, Check } from 'lucide-react';
import { toLocalDateStr, isToday } from '@/lib/dateUtils';
import { PageLoader } from '@/components/Pageloader';
import { DeleteModal } from '@/components/Deletemodal';

export default function HabitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const habitId = params.id as string;
  const { token } = useAuthStore();
  const { updateHabit, removeHabit } = useHabitStore();

  const [habit, setHabit] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [milestone, setMilestone] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    reminderEnabled: false,
    reminderTime: '09:00',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchHabitData = async () => {
      try {
        const [habitData, logsData, statsData] = await Promise.all([
          api.habits.getById(habitId),
          api.habits.getLogs(habitId),
          api.habits.getStats(habitId),
        ]);

        setHabit(habitData);
        setLogs(logsData);
        setStats(statsData);
        setEditForm({
          name: habitData.name ?? '',
          description: habitData.description ?? '',
          color: habitData.color ?? '#3b82f6',
          reminderEnabled: habitData.reminder?.enabled === true,
          reminderTime: habitData.reminder?.time ?? '09:00',
        });
      } catch {
        router.push('/habits');
      } finally {
        setLoading(false);
      }
    };

    fetchHabitData();
  }, [token, router, habitId]);

  const handleCheckIn = async () => {
    if (!habit) return;
    setCheckInLoading(true);
    setCheckInError(null);

    try {
      const todayStr = toLocalDateStr(new Date());

      const response = await api.habits.log(habitId, {
        date: todayStr,
        completed: true,
        value: 1,
      });

      if (response.alreadyCompleted) {
        setCheckInError('Already checked in today!');
        return;
      }

      setCelebrating(true);
      if (response.milestone) setMilestone(response.milestone);
      setTimeout(() => setCelebrating(false), 3000);

      const [newHabit, newLogs, newStats] = await Promise.all([
        api.habits.getById(habitId),
        api.habits.getLogs(habitId),
        api.habits.getStats(habitId),
      ]);

      setHabit(newHabit);
      setLogs(newLogs);
      setStats(newStats);
      updateHabit(newHabit);
    } catch (error: any) {
      setCheckInError(error?.message || error?.error || 'Check-in failed. Please try again.');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleEdit = async () => {
    setEditLoading(true);
    setEditError(null);
    try {
      const updated = await api.habits.update(habitId, {
        name: editForm.name,
        description: editForm.description,
        color: editForm.color,
        reminder: {
          enabled: editForm.reminderEnabled,
          time: editForm.reminderTime,
        },
      });
      setHabit(updated);
      updateHabit(updated);
      setEditing(false);
    } catch (error: any) {
      setEditError(error?.message || error?.error || 'Failed to update habit.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.habits.delete(habitId);
      removeHabit(habitId);
      router.push('/habits');
    } catch (error: any) {
      setDeleteLoading(false);
      setDeleteModalOpen(false);
      setCheckInError(error?.message || 'Failed to delete habit.');
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageLoader message="Loading habit..." />
      </Layout>
    );
  }

  if (!habit) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Habit not found</div>
        </div>
      </Layout>
    );
  }

  const todayStr = toLocalDateStr(new Date());
  const todayLog = logs.find(
    log => toLocalDateStr(new Date(log.date)) === todayStr && log.completed
  );

  const completedThisWeek = logs.filter(log => {
    if (!log.completed) return false;
    const logDate = new Date(log.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    return logDate >= weekAgo;
  }).length;

  return (
    <Layout>
      <DeleteModal
        isOpen={deleteModalOpen}
        title={`Delete "${habit.name}"`}
        description="Are you sure you want to delete this habit? All logs and streak data will be permanently removed."
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
        loading={deleteLoading}
      />

      <div className="space-y-8">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div
              className="w-16 h-16 rounded-lg flex-shrink-0"
              style={{ backgroundColor: editing ? editForm.color : habit.color }}
            />
            <div className="flex-1">
              {editing ? (
                <div className="space-y-3">
                  <Input
                    value={editForm.name}
                    onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                    className="text-2xl font-bold h-12"
                    placeholder="Habit name"
                  />
                  <Input
                    value={editForm.description}
                    onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Description (optional)"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Color:</label>
                    <input
                      type="color"
                      value={editForm.color}
                      onChange={e => setEditForm(p => ({ ...p, color: e.target.value }))}
                      className="w-10 h-10 rounded cursor-pointer border border-border"
                    />
                  </div>
                  <div className="space-y-3 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-semibold">WhatsApp Reminder</p>
                    <div className="flex items-center gap-2">
                      <input
                        id="editReminderEnabled"
                        type="checkbox"
                        checked={editForm.reminderEnabled}
                        onChange={e => setEditForm(p => ({ ...p, reminderEnabled: e.target.checked }))}
                        className="w-4 h-4 rounded border-border"
                      />
                      <label htmlFor="editReminderEnabled" className="text-sm font-medium cursor-pointer">
                        Enable Reminder
                      </label>
                    </div>
                    {editForm.reminderEnabled && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Reminder Time</label>
                        <Input
                          type="time"
                          value={editForm.reminderTime}
                          onChange={e => setEditForm(p => ({ ...p, reminderTime: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>
                  {editError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                      {editError}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleEdit} disabled={editLoading}>
                      <Check className="w-4 h-4 mr-1" />
                      {editLoading ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditForm({
                          name: habit.name ?? '',
                          description: habit.description ?? '',
                          color: habit.color ?? '#3b82f6',
                          reminderEnabled: habit.reminder?.enabled === true,
                          reminderTime: habit.reminder?.time ?? '09:00',
                        });
                        setEditError(null);
                        setEditing(false);
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-4xl font-bold">{habit.name}</h1>
                  {habit.description && (
                    <p className="text-muted-foreground mt-1">{habit.description}</p>
                  )}
                  <div className="flex gap-4 mt-4 text-sm">
                    <span className="px-2 py-1 bg-muted rounded capitalize">{habit.category}</span>
                    <span className="px-2 py-1 bg-muted rounded capitalize">{habit.frequency}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {!editing && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setEditing(true)} title="Edit habit">
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setDeleteModalOpen(true)}
                title="Delete habit"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {celebrating && (
          <div className="p-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg text-center space-y-2 animate-pulse">
            <div className="text-4xl">🎉</div>
            <h2 className="text-2xl font-bold">
              {milestone ? `${milestone} Streak!` : 'Checked In!'}
            </h2>
            <p className="text-muted-foreground">
              {milestone ? `You've achieved a ${milestone} streak!` : 'Great job keeping up your habit!'}
            </p>
          </div>
        )}

        {checkInError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive text-center">
            {checkInError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={<Flame className="w-5 h-5 text-orange-500" />} label="Current Streak" value={stats?.currentStreak || 0} unit="days" />
          <StatCard icon={<Zap className="w-5 h-5 text-yellow-500" />} label="Longest Streak" value={habit.stats?.longestStreak || 0} unit="days" />
          <StatCard icon={<TrendingUp className="w-5 h-5 text-blue-500" />} label="Completion Rate" value={stats?.completionRate || 0} unit="%" />
          <StatCard icon={<Calendar className="w-5 h-5 text-green-500" />} label="This Week" value={completedThisWeek} unit="days" />
          <StatCard icon={<Calendar className="w-5 h-5 text-purple-500" />} label="Total Completions" value={stats?.totalCompletions || 0} unit="times" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90"
            onClick={handleCheckIn}
            disabled={!!todayLog || checkInLoading}
          >
            {checkInLoading ? 'Checking in...' : todayLog ? '✓ Done Today' : 'Check In Today'}
          </Button>
          <Button size="lg" variant="outline" onClick={() => router.push('/habits')}>
            Back to Habits
          </Button>
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Last 30 Days</CardTitle>
                <CardDescription>Visual representation of your completions</CardDescription>
              </CardHeader>
              <CardContent>
                <CalendarView logs={logs} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Completion History</CardTitle>
                <CardDescription>All your logged completions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {logs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No logs yet</p>
                  ) : (
                    logs.map(log => (
                      <div key={log._id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">
                            {new Date(log.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              timeZone: 'UTC', 
                            })}
                          </p>
                          {log.notes && <p className="text-sm text-muted-foreground">{log.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {log.completed && (
                            <>
                              <span className="text-sm font-semibold text-green-600">✓</span>
                              {log.milestone?.reached && <span className="text-lg">🎉</span>}
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Habit Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="font-medium mb-2">Frequency</p>
                  <p className="text-muted-foreground capitalize">{habit.frequency}</p>
                </div>
                <div>
                  <p className="font-medium mb-2">Target</p>
                  <p className="text-muted-foreground">
                    {habit.target?.value} {habit.target?.unit} per{' '}
                    {habit.frequency === 'daily' ? 'day' : 'week'}
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-2">Reminder</p>
                  {habit.reminder?.enabled ? (
                    <p className="text-muted-foreground">Daily at {habit.reminder.time}</p>
                  ) : (
                    <p className="text-muted-foreground">Not enabled</p>
                  )}
                </div>
                <div>
                  <p className="font-medium mb-2">Status</p>
                  <p className="text-muted-foreground">{habit.isActive ? 'Active' : 'Paused'}</p>
                </div>
                <div>
                  <p className="font-medium mb-2">Started</p>
                  <p className="text-muted-foreground">
                    {new Date(habit.startDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function StatCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: number; unit: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div>{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">
            {value} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarView({ logs }: { logs: any[] }) {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const days: any[] = [];
  for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = toLocalDateStr(new Date(d));
    const log = logs.find(l => toLocalDateStr(new Date(l.date)) === dateStr);
    days.push({ date: new Date(d), completed: log?.completed || false, dateStr });
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day, idx) => (
        <div
          key={idx}
          className={`aspect-square rounded-md flex items-center justify-center text-xs font-semibold transition-colors ${
            day.completed ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
          }`}
          title={day.date.toLocaleDateString()}
        >
          {day.date.getDate()}
        </div>
      ))}
    </div>
  );
}