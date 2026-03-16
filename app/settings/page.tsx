'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import {
  Copy, Check, MessageCircle, CheckCircle2, XCircle,
  Clock, AlertTriangle, RefreshCw, Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const SANDBOX_NUMBER = process.env.NEXT_PUBLIC_TWILIO_SANDBOX_NUMBER || '+14155238886';
const SANDBOX_CODE   = process.env.NEXT_PUBLIC_TWILIO_SANDBOX_CODE   || 'join scientific-lungs';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
      title="Copy"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-green-500" />
        : <Copy  className="w-3.5 h-3.5 text-muted-foreground" />
      }
    </button>
  );
}

type MyStatus = {
  number:        string | null;
  joined:        boolean;
  sessionActive: boolean;
  lastMessageAt: string | null;
  failReason:    string | null;
};

function MySandboxStatus({ whatsappNumber }: { whatsappNumber: string }) {
  const [status, setStatus]   = useState<MyStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!whatsappNumber) return;
    setLoading(true);
    try {
      const data = await api.get('/whatsapp/my-status');
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [whatsappNumber]);

  useEffect(() => { fetch(); }, [fetch]);

  if (!whatsappNumber) return null;

  if (loading && !status) {
    return (
      <Card>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!status) return null;

  const isActive = status.joined && status.sessionActive;
  const isJoinedNotActive = status.joined && !status.sessionActive;
  const isNotJoined = !status.joined;

  const lastMsgFormatted = status.lastMessageAt
    ? new Date(status.lastMessageAt).toLocaleString('en-IN', {
        timeZone:  'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  let hoursAgo: number | null = null;
  if (status.lastMessageAt) {
    hoursAgo = Math.floor((Date.now() - new Date(status.lastMessageAt).getTime()) / (1000 * 60 * 60));
  }

  return (
    <Card className={
      isActive
        ? 'border-green-200 dark:border-green-800'
        : isJoinedNotActive
          ? 'border-amber-200 dark:border-amber-800'
          : 'border-red-200 dark:border-red-900'
    }>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            {isActive
              ? <CheckCircle2 className="w-4 h-4 text-green-500" />
              : isJoinedNotActive
                ? <AlertTriangle className="w-4 h-4 text-amber-500" />
                : <XCircle className="w-4 h-4 text-red-500" />
            }
            Your WhatsApp Status
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={fetch} className="h-7 w-7" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Status badges row */}
        <div className="flex flex-wrap gap-2">
          {/* Joined */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Sandbox joined:</span>
            {status.joined
              ? <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[11px] px-2">Yes</Badge>
              : <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-[11px] px-2">No</Badge>
            }
          </div>

          {/* Session */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">24h session:</span>
            {status.sessionActive
              ? <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[11px] px-2">Active</Badge>
              : <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-[11px] px-2">Expired</Badge>
            }
          </div>
        </div>

        {/* Last message time */}
        {lastMsgFormatted && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            Last message: <strong className="text-foreground">{lastMsgFormatted}</strong>
            {hoursAgo !== null && (
              <span className={hoursAgo >= 20 ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                ({hoursAgo === 0 ? 'just now' : `${hoursAgo}h ago`})
              </span>
            )}
          </div>
        )}

        {/* State-specific guidance */}
        {isActive && hoursAgo !== null && hoursAgo >= 20 && (
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Your session expires in ~{24 - hoursAgo}h. Send any message to{' '}
              <span className="font-mono font-semibold">{SANDBOX_NUMBER}</span> soon to keep reminders active.
            </p>
          </div>
        )}

        {isActive && (hoursAgo === null || hoursAgo < 20) && (
          <div className="p-2.5 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-xs text-green-700 dark:text-green-400 leading-relaxed">
              You're all set. WhatsApp reminders will be delivered to{' '}
              <span className="font-mono font-semibold">{status.number}</span>.
            </p>
          </div>
        )}

        {isJoinedNotActive && (
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Your 24h session has expired. Send <strong>any message</strong> (e.g. "hi") to{' '}
              <span className="font-mono font-semibold">{SANDBOX_NUMBER}</span> on WhatsApp to reactivate.
              Reminders will fall back to email until you do.
            </p>
          </div>
        )}

        {isNotJoined && (
          <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg">
            <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
              You haven't joined the sandbox yet. Follow the steps below to activate WhatsApp reminders.
              Until then, reminders will be sent by email.
            </p>
          </div>
        )}

        {status.failReason && (
          <p className="text-xs text-muted-foreground italic">{status.failReason}</p>
        )}
      </CardContent>
    </Card>
  );
}

function WhatsAppJoinInstructions() {
  return (
    <Card className="border-green-200 dark:border-green-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="w-5 h-5 text-green-500" />
          Activate WhatsApp Reminders
        </CardTitle>
        <CardDescription>Two quick steps — done once, works forever</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        <div className="space-y-1.5">
          <p className="text-sm font-semibold">Step 1 — Save this number in your phone</p>
          <div className="flex items-center gap-2 px-3 py-2.5 bg-muted rounded-lg font-mono text-sm">
            <span className="flex-1 select-all">{SANDBOX_NUMBER}</span>
            <CopyButton text={SANDBOX_NUMBER} />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-semibold">Step 2 — Send this exact message on WhatsApp</p>
          <div className="flex items-center gap-2 px-3 py-2.5 bg-muted rounded-lg font-mono text-sm">
            <span className="flex-1 select-all">{SANDBOX_CODE}</span>
            <CopyButton text={SANDBOX_CODE} />
          </div>
          <p className="text-xs text-muted-foreground">Send exactly as shown, including the word "join".</p>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold">Step 3 — Save your number in the form below</p>
          <p className="text-xs text-muted-foreground">Enter your number with country code (digits only).</p>
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold mb-1">
            Keep your session active — send once a day
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            WhatsApp sandbox requires you to send <strong>any message</strong> to{' '}
            <span className="font-mono">{SANDBOX_NUMBER}</span> at least once every 24 hours.
            A simple <span className="font-mono">"hi"</span> is enough.
            If you miss a day your reminder won't arrive — just message again to reactivate.
          </p>
        </div>

      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const VALID_TABS = ['profile', 'preferences', 'whatsapp', 'about'] as const;
  type TabValue = typeof VALID_TABS[number];

  const tabFromQuery = searchParams.get('tab') as TabValue | null;
  const initialTab: TabValue = VALID_TABS.includes(tabFromQuery as TabValue)
    ? (tabFromQuery as TabValue)
    : 'profile';

  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

  const handleTabChange = (val: string) => {
    setActiveTab(val as TabValue);
    router.replace(`/settings?tab=${val}`, { scroll: false });
  };
  const { user, token, setUser } = useAuthStore();
  const { setTheme } = useTheme();
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState('');
  const [error, setError]       = useState('');

  const isAdmin = (user as any)?.isAdmin === true;

  const [formData, setFormData] = useState({
    name:               user?.name || '',
    email:              user?.email || '',
    phone:              user?.phone || '',
    whatsappNumber:     user?.whatsappNumber || '',
    reminderTime:       user?.preferences?.reminderTime || '09:00',
    reminderType:       user?.preferences?.reminderType || 'daily',
    theme:              user?.preferences?.theme || 'dark',
    whatsappReminders:  user?.preferences?.whatsappReminders || false,
  });

  const [fieldErrors, setFieldErrors] = useState({ name: '', phone: '', whatsappNumber: '' });

  useEffect(() => {
    if (user) {
      setFormData({
        name:               user.name || '',
        email:              user.email || '',
        phone:              user.phone || '',
        whatsappNumber:     user.whatsappNumber || '',
        reminderTime:       user.preferences?.reminderTime || '09:00',
        reminderType:       user.preferences?.reminderType || 'daily',
        theme:              user.preferences?.theme || 'dark',
        whatsappReminders:  user.preferences?.whatsappReminders || false,
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
      const r = String(newVal).trim() ? validateWhatsApp(String(newVal)) : { valid: true, message: '' };
      setFieldErrors(fe => ({ ...fe, whatsappNumber: r.valid ? '' : r.message }));
    }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nameErr  = validateName(formData.name).message;
    const phoneErr = validatePhone(formData.phone).message;
    setFieldErrors(fe => ({ ...fe, name: nameErr, phone: phoneErr }));
    if (nameErr || phoneErr) return;

    setLoading(true); setMessage(''); setError('');
    try {
      const response = await api.auth.updateProfile({
        name:           formData.name.trim(),
        phone:          formData.phone.trim(),
        whatsappNumber: formData.whatsappNumber.trim(),
        preferences: {
          theme:             formData.theme,
          reminderTime:      formData.reminderTime,
          reminderType:      formData.reminderType,
          whatsappReminders: formData.whatsappReminders,
        },
      });
      setUser(response);
      setTheme(formData.theme);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3500);
    } catch (err: any) {
      setError(err.error || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWhatsApp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (formData.whatsappNumber.trim()) {
      const waErr = validateWhatsApp(formData.whatsappNumber).message;
      setFieldErrors(fe => ({ ...fe, whatsappNumber: waErr }));
      if (waErr) return;
    }
    setLoading(true); setMessage(''); setError('');
    try {
      const response = await api.auth.updateProfile({
        whatsappNumber: formData.whatsappNumber.trim(),
        preferences: {
          theme:             formData.theme,
          reminderTime:      formData.reminderTime,
          reminderType:      formData.reminderType,
          whatsappReminders: formData.whatsappReminders,
        },
      });
      setUser(response);
      setMessage('WhatsApp settings saved!');
      setTimeout(() => setMessage(''), 3500);
    } catch (err: any) {
      setError(err.error || 'Failed to update WhatsApp settings.');
    } finally {
      setLoading(false);
    }
  };

  const successBanner = message && (
    <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
      ✓ {message}
    </div>
  );
  const errorBanner = error && (
    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
      {error}
    </div>
  );

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          {/* ─── Profile ─── */}
          <TabsContent value="profile" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Fields marked * are required.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-6" noValidate>
                  {successBanner}{errorBanner}
                  <div className="space-y-1">
                    <label htmlFor="name" className="text-sm font-medium">Full Name *</label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} maxLength={80} className={fieldErrors.name ? 'border-destructive' : ''} />
                    <FieldError message={fieldErrors.name} />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="email" className="text-sm font-medium">Email</label>
                    <Input id="email" name="email" value={formData.email} disabled className="opacity-50 cursor-not-allowed" />
                    <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="phone" className="text-sm font-medium">Phone Number <span className="font-normal text-muted-foreground">(optional)</span></label>
                    <Input id="phone" name="phone" type="tel" placeholder="+91 9440667351" value={formData.phone} onChange={handleChange} className={fieldErrors.phone ? 'border-destructive' : ''} />
                    <FieldError message={fieldErrors.phone} />
                    <p className="text-xs text-muted-foreground">Format: +country_code number</p>
                  </div>
                  <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Preferences ─── */}
          <TabsContent value="preferences" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Customize your app experience</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {successBanner}{errorBanner}
                  <div className="space-y-2">
                    <label htmlFor="theme" className="text-sm font-medium">Theme</label>
                    <select id="theme" name="theme" value={formData.theme} onChange={handleChange} className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground">
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="reminderTime" className="text-sm font-medium">Daily Reminder Time</label>
                    <Input id="reminderTime" name="reminderTime" type="time" value={formData.reminderTime} onChange={handleChange} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="whatsappReminders" name="whatsappReminders" type="checkbox" checked={formData.whatsappReminders} onChange={handleChange} className="w-4 h-4 rounded border-border" />
                    <label htmlFor="whatsappReminders" className="text-sm font-medium cursor-pointer">Enable WhatsApp Reminders</label>
                  </div>
                  <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save Preferences'}</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── WhatsApp ─── */}
          <TabsContent value="whatsapp" className="space-y-4 mt-6">

            {/* 1. Personal session status — every user sees their own */}
            <MySandboxStatus whatsappNumber={formData.whatsappNumber} />

            {/* 2. Join instructions */}
            <WhatsAppJoinInstructions />

            {/* 3. Number + reminder type form */}
            <Card>
              <CardHeader>
                <CardTitle>Your WhatsApp Number</CardTitle>
                <CardDescription>Save the number you used to join the sandbox</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {successBanner}{errorBanner}
                <form onSubmit={handleSaveWhatsApp} className="space-y-4" noValidate>
                  <div className="space-y-1">
                    <label htmlFor="whatsappNumber" className="text-sm font-medium">
                      WhatsApp Number <span className="text-muted-foreground font-normal">(country code + digits, no + or spaces)</span>
                    </label>
                    <Input
                      id="whatsappNumber"
                      name="whatsappNumber"
                      placeholder="e.g. 919440667351"
                      value={formData.whatsappNumber}
                      onChange={handleChange}
                      className={fieldErrors.whatsappNumber ? 'border-destructive' : ''}
                    />
                    <FieldError message={fieldErrors.whatsappNumber} />
                    <p className="text-xs text-muted-foreground">
                      Examples: <code className="bg-muted px-1 rounded">919440667351</code> (India +91) ·{' '}
                      <code className="bg-muted px-1 rounded">14155238886</code> (US +1) ·{' '}
                      <code className="bg-muted px-1 rounded">447700900123</code> (UK +44)
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
                    {loading ? 'Saving…' : 'Save WhatsApp Settings'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* 4. Admin-only controls */}
            {isAdmin && (
              <div className="pt-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-0.5">
                  Admin Controls
                </p>
                <WhatsAppQRDisplay />
              </div>
            )}

          </TabsContent>

          {/* ─── About ─── */}
          <TabsContent value="about" className="space-y-4 mt-6">
            <Card>
              <CardHeader><CardTitle>About Habit Tracker</CardTitle></CardHeader>
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
                    <li>Email fallback reminders</li>
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