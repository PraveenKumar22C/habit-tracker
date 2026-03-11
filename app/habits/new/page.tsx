'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useHabitStore } from '@/lib/store';
import Layout from '@/components/Layout';
import Link from 'next/link';

const CATEGORIES = ['health', 'fitness', 'learning', 'productivity', 'mindfulness', 'social', 'other'];
const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function NewHabitPage() {
  const router = useRouter();
  const { addHabit } = useHabitStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'health',
    color: '#3b82f6',
    frequency: 'daily',
    targetValue: 1,
    targetUnit: 'times',
    reminderEnabled: false,
    reminderTime: '09:00',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.name.trim()) {
        setError('Habit name is required');
        setLoading(false);
        return;
      }

      const habitData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        color: formData.color,
        frequency: formData.frequency,
        target: {
          value: parseInt(formData.targetValue.toString()),
          unit: formData.targetUnit,
        },
        reminder: {
          enabled: formData.reminderEnabled,
          time: formData.reminderTime,
        },
      };

      const response = await api.habits.create(habitData);
      addHabit(response);
      router.push('/habits');
    } catch (err: any) {
      setError(err.error || 'Failed to create habit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Create New Habit</h1>
          <p className="text-muted-foreground">Define a new habit to track</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Habit Details</CardTitle>
            <CardDescription>Fill in the information about your new habit</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{error}</div>}

              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Habit Name *
                </label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Morning Exercise"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <Input
                  id="description"
                  name="description"
                  placeholder="e.g., 30 minutes of running or gym workout"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="category" className="text-sm font-medium">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="color" className="text-sm font-medium">
                    Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`w-10 h-10 rounded-lg border-2 ${formData.color === color ? 'border-foreground' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="frequency" className="text-sm font-medium">
                  Frequency
                </label>
                <select
                  id="frequency"
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="targetValue" className="text-sm font-medium">
                    Target Value
                  </label>
                  <Input
                    id="targetValue"
                    name="targetValue"
                    type="number"
                    min="1"
                    value={formData.targetValue}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="targetUnit" className="text-sm font-medium">
                    Unit
                  </label>
                  <select
                    id="targetUnit"
                    name="targetUnit"
                    value={formData.targetUnit}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="times">Times</option>
                    <option value="hours">Hours</option>
                    <option value="minutes">Minutes</option>
                    <option value="km">KM</option>
                    <option value="pages">Pages</option>
                    <option value="items">Items</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    id="reminderEnabled"
                    name="reminderEnabled"
                    type="checkbox"
                    checked={formData.reminderEnabled}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-border"
                  />
                  <label htmlFor="reminderEnabled" className="text-sm font-medium cursor-pointer">
                    Enable Reminder
                  </label>
                </div>

                {formData.reminderEnabled && (
                  <div className="space-y-2">
                    <label htmlFor="reminderTime" className="text-sm font-medium">
                      Reminder Time
                    </label>
                    <Input
                      id="reminderTime"
                      name="reminderTime"
                      type="time"
                      value={formData.reminderTime}
                      onChange={handleChange}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Creating...' : 'Create Habit'}
                </Button>
                <Link href="/habits" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
