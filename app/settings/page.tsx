'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/Layout';
import { WhatsAppQRDisplay } from '@/components/WhatsAppQRDisplay';

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, setUser } = useAuthStore();
  const { setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    whatsappNumber: user?.whatsappNumber || '',   
    reminderTime: user?.preferences?.reminderTime || '09:00',
    reminderType: user?.preferences?.reminderType || 'daily',
    theme: user?.preferences?.theme || 'dark',
    whatsappReminders: user?.preferences?.whatsappReminders || false,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        whatsappNumber: user.whatsappNumber || '',   
        reminderTime: user.preferences?.reminderTime || '09:00',
        reminderType: user.preferences?.reminderType || 'daily',
        theme: user.preferences?.theme || 'dark',
        whatsappReminders: user.preferences?.whatsappReminders || false,
      });
    }
  }, [user]);

  useEffect(() => {
    if (!token) {
      router.push('/login');
    }
  }, [token, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await api.auth.updateProfile({
        name: formData.name,
        phone: formData.phone,
        whatsappNumber: formData.whatsappNumber,      
        preferences: {
          theme: formData.theme,
          reminderTime: formData.reminderTime,
          reminderType: formData.reminderType,          
          whatsappReminders: formData.whatsappReminders,
        },
      });

      setUser(response);

      setTheme(formData.theme);

      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {message && <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-sm text-green-800">{message}</div>}
                  {error && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{error}</div>}

                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">Full Name</label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email (Cannot be changed)</label>
                    <Input id="email" name="email" value={formData.email} disabled className="opacity-50" />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+1234567890"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Customize your app experience</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {message && <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-sm text-green-800">{message}</div>}
                  {error && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{error}</div>}

                  <div className="space-y-2">
                    <label htmlFor="theme" className="text-sm font-medium">Theme</label>
                    <select
                      id="theme"
                      name="theme"
                      value={formData.theme}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="reminderTime" className="text-sm font-medium">Daily Reminder Time</label>
                    <Input
                      id="reminderTime"
                      name="reminderTime"
                      type="time"
                      value={formData.reminderTime}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="whatsappReminders"
                      name="whatsappReminders"
                      type="checkbox"
                      checked={formData.whatsappReminders}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-border"
                    />
                    <label htmlFor="whatsappReminders" className="text-sm font-medium cursor-pointer">
                      Enable WhatsApp Reminders
                    </label>
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4 mt-6">
            <WhatsAppQRDisplay />

            <Card>
              <CardHeader>
                <CardTitle>WhatsApp Reminder Configuration</CardTitle>
                <CardDescription>Set up WhatsApp number and reminder preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {message && <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-sm text-green-800">{message}</div>}
                {error && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{error}</div>}

                <div className="space-y-2">
                  <label htmlFor="whatsappNumber" className="text-sm font-medium">
                    WhatsApp Number (with country code)
                  </label>
                  <Input
                    id="whatsappNumber"
                    name="whatsappNumber"
                    placeholder="Example: 919440667351 (India +91)"
                    value={formData.whatsappNumber}                  
                    onChange={handleChange}                          
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: Country code + phone number (no spaces or hyphens)
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Reminder Type</label>
                  <select
                    name="reminderType"
                    value={formData.reminderType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly (Sunday)</option>
                    <option value="both">Both Daily & Weekly</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Daily: Reminders at your scheduled time. Weekly: Summary every Sunday at 9 PM.
                  </p>
                </div>

                <Button onClick={handleSaveProfile as any} disabled={loading}>
                  {loading ? 'Updating...' : 'Update WhatsApp Settings'}
                </Button>

                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-sm">
                  <p className="font-semibold mb-2">How it works:</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-300">
                    <li>Scan the QR code above with WhatsApp</li>
                    <li>Enter your WhatsApp number above and save</li>
                    <li>Reminders will be sent automatically at your scheduled time</li>
                    <li>Weekly reports sent every Sunday evening</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>About Habit Tracker</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Version</h3>
                  <p className="text-muted-foreground">1.0.0</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Features</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                    <li>Habit tracking and management</li>
                    <li>Streak monitoring</li>
                    <li>Analytics and insights</li>
                    <li>GitHub-style heatmap visualization</li>
                    <li>Milestone celebrations</li>
                    <li>WhatsApp reminders</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Support</h3>
                  <p className="text-muted-foreground text-sm">mr.chandu.22@gmail.com</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}