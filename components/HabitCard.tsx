'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Habit } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useHabitStore } from '@/lib/store';
import { Check, Flame } from 'lucide-react';

interface HabitCardProps {
  habit: Habit;
}

function isToday(date: Date | string): boolean {
  const d = new Date(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function HabitCard({ habit }: HabitCardProps) {
  const [isChecking, setIsChecking] = useState(false);
  const { updateHabit } = useHabitStore();
  const [checkedToday, setCheckedToday] = useState(false);

  // ✅ Fetch today's log status on mount from the API
  useEffect(() => {
    const checkTodayStatus = async () => {
      try {
        const logs = await api.habits.getLogs(habit._id);
        const alreadyDone = logs.some((l: any) => isToday(l.date) && l.completed);
        setCheckedToday(alreadyDone);
      } catch (error) {
        console.error('Failed to fetch logs:', error);
      }
    };

    checkTodayStatus();
  }, [habit._id]);

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      const now = new Date();
      const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

      await api.habits.log(habit._id, {
        date: localMidnight.toISOString(),
        completed: true,
        value: 1,
      });

      setCheckedToday(true);

      updateHabit({
        ...habit,
        stats: {
          ...habit.stats,
          currentStreak: habit.stats.currentStreak + 1,
          totalCompletions: habit.stats.totalCompletions + 1,
        },
      });
    } catch (error) {
      console.error('Failed to log habit:', error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 group" style={{ borderLeftColor: habit.color, borderLeftWidth: '5px' }}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{habit.name}</CardTitle>
            {habit.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{habit.description}</p>
            )}
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-accent/20 text-accent whitespace-nowrap capitalize">
            {habit.category}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Streak */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
            <div>
              <span className="text-sm text-muted-foreground">Current Streak</span>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{habit.stats.currentStreak}</p>
            </div>
          </div>
          <span className="text-right">
            <p className="text-xs text-muted-foreground">Best</p>
            <p className="text-lg font-bold text-primary">{habit.stats.longestStreak}</p>
          </span>
        </div>

        {/* Completion Rate */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-foreground">Completion Rate</span>
            <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-bold" style={{ 
              backgroundColor: habit.color + '20',
              color: habit.color
            }}>
              {habit.stats.completionRate}%
            </span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(habit.stats.completionRate, 100)}%`,
                backgroundColor: habit.color,
                boxShadow: `0 0 12px ${habit.color}40`,
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3">
          <Button
            className={`flex-1 font-semibold transition-all ${
              checkedToday
                ? 'bg-accent/20 text-accent hover:bg-accent/30'
                : 'bg-primary hover:bg-primary/90 text-white'
            }`}
            disabled={isChecking || checkedToday}
            onClick={handleCheck}
            variant={checkedToday ? 'outline' : 'default'}
          >
            <Check className="w-4 h-4 mr-2" />
            {isChecking ? 'Checking...' : checkedToday ? 'Completed' : 'Check In'}
          </Button>
          <Link href={`/habits/${habit._id}`} className="flex-1">
            <Button variant="outline" className="w-full font-semibold hover:bg-secondary/10 hover:text-secondary">
              View
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}