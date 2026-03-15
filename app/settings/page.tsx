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
import { FieldError } from '@/components/Fielderror';
import { validateName, validatePhone, validateWhatsApp } from '@/lib/validations';

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, setUser } = useAuthStore();
  const { setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isAdmin = (user as any)?.isAdmin === true;

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

  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    phone: '',
    whatsappNumber: '',
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
    if (!token) router.push('/login');
  }, [token, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newVal = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: newVal }));

    if (name === 'name') {
      const r = validateName(String(newVal));
      setFieldErrors(fe => ({ ...fe, name: r.valid ? '' : r.message }));
    }
    if (name === 'phone') {
      const r = validatePhone(String(newVal));
      setFieldErrors(fe => ({ ...fe, phone: r.valid ? '' : r.message }));
    }
    if (name === 'whatsappNumber') {
      if (String(newVal).trim() === '') {
        setFieldErrors(fe => ({ ...fe, whatsappNumber: '' }));
      } else {
        const r = validateWhatsApp(String(newVal));
        setFieldErrors(fe => ({ ...fe, whatsappNumber: r.valid ? '' : r.message }));
      }
    }
  };

  const validateProfileForm = () => {
    const nameErr = validateName(formData.name).message;
    const phoneErr = validatePhone(formData.phone).message;
    setFieldErrors(fe => ({ ...fe, name: nameErr, phone: phoneErr }));
    return !nameErr && !phoneErr;
  };

  const validateWhatsAppForm = () => {
    if (formData.whatsappNumber.trim()) {
      const waErr = validateWhatsApp(formData.whatsappNumber).message;
      setFieldErrors(fe => ({ ...fe, whatsappNumber: waErr }));
      return !waErr;
    }
    return true;
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateProfileForm()) return;
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await api.auth.updateProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        whatsappNumber: formData.whatsappNumber.trim(),
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
      setTimeout(() => setMessage(''), 3500);
    } catch (err: any) {
      setError(err.error || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWhatsApp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateWhatsAppForm()) return;
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await api.auth.updateProfile({
        whatsappNumber: formData.whatsappNumber.trim(),
        preferences: {
          theme: formData.theme,
          reminderTime: formData.reminderTime,
          reminderType: formData.reminderType,
          whatsappReminders: formData.whatsappReminders,
        },
      });

      setUser(response);
      setMessage('WhatsApp settings updated!');
      setTimeout(() => setMessage(''), 3500);
    } catch (err: any) {
      setError(err.error || 'Failed to update WhatsApp settings.');
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

          {/* ─── Profile Tab ─── */}
          <TabsContent value="profile" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information. Fields marked * are required.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-6" noValidate>
                  {message && (
                    <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
                      ✓ {message}
                    </div>
                  )}
                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  {/* Name */}
                  <div className="space-y-1">
                    <label htmlFor="name" className="text-sm font-medium">Full Name *</label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      maxLength={80}
                      className={fieldErrors.name ? 'border-destructive focus:border-destructive' : ''}
                    />
                    <FieldError message={fieldErrors.name} />
                  </div>

                  {/* Email (read only) */}
                  <div className="space-y-1">
                    <label htmlFor="email" className="text-sm font-medium">Email</label>
                    <Input
                      id="email"
                      name="email"
                      value={formData.email}
                      disabled
                      className="opacity-50 cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label htmlFor="phone" className="text-sm font-medium">
                      Phone Number <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+91 9440667351"
                      value={formData.phone}
                      onChange={handleChange}
                      className={fieldErrors.phone ? 'border-destructive focus:border-destructive' : ''}
                    />
                    <FieldError message={fieldErrors.phone} />
                    <p className="text-xs text-muted-foreground">Format: +country_code number (e.g. +91 9440667351)</p>
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving…' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Preferences Tab ─── */}
          <TabsContent value="preferences" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Customize your app experience</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {message && (
                    <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
                      ✓ {message}
                    </div>
                  )}
                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                      {error}
                    </div>
                  )}

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
                    {loading ? 'Saving…' : 'Save Preferences'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── WhatsApp Tab ─── */}
          <TabsContent value="whatsapp" className="space-y-4 mt-6">
            {isAdmin && <WhatsAppQRDisplay />}

            <Card>
              <CardHeader>
                <CardTitle>WhatsApp Configuration</CardTitle>
                <CardDescription>Set up your WhatsApp number and reminder schedule</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {message && (
                  <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
                    ✓ {message}
                  </div>
                )}
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSaveWhatsApp} className="space-y-4" noValidate>
                  <div className="space-y-1">
                    <label htmlFor="whatsappNumber" className="text-sm font-medium">
                      WhatsApp Number <span className="text-muted-foreground font-normal">(with country code, no + or spaces)</span>
                    </label>
                    <Input
                      id="whatsappNumber"
                      name="whatsappNumber"
                      placeholder="e.g. 919440667351"
                      value={formData.whatsappNumber}
                      onChange={handleChange}
                      className={fieldErrors.whatsappNumber ? 'border-destructive focus:border-destructive' : ''}
                    />
                    <FieldError message={fieldErrors.whatsappNumber} />
                    <p className="text-xs text-muted-foreground">
                      Format: country code + number, digits only.
                      <br />Examples: <code className="bg-muted px-1 rounded">919440667351</code> (India +91) · <code className="bg-muted px-1 rounded">14155238886</code> (US +1) · <code className="bg-muted px-1 rounded">447700900123</code> (UK +44)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="settingsReminderType" className="text-sm font-medium">Reminder Type</label>
                    <select
                      id="settingsReminderType"
                      name="reminderType"
                      value={formData.reminderType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    >
                      <option value="daily">Daily (at your per-habit scheduled time)</option>
                      <option value="weekly">Weekly Summary (Sunday 9 PM IST)</option>
                      <option value="both">Both Daily & Weekly</option>
                    </select>
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading ? 'Updating…' : 'Update WhatsApp Settings'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── About Tab ─── */}
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
                    <li>WhatsApp reminders via Twilio</li>
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