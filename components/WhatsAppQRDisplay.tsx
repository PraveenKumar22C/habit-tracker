'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, XCircle, Loader2, MessageCircle, Copy, Check,
  Send, Clock, RefreshCw, Play, ChevronDown, ChevronRight,
  Users, AlertTriangle, ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';

const SANDBOX_NUMBER = process.env.NEXT_PUBLIC_TWILIO_SANDBOX_NUMBER || '+14155238886';
const SANDBOX_CODE   = process.env.NEXT_PUBLIC_TWILIO_SANDBOX_CODE   || 'join scientific-lungs';

// ── Reusable accordion ────────────────────────────────────────────────────────
function AccordionSection({
  title, description, icon, children, defaultOpen = false, accentColor = 'text-primary',
}: {
  title: string; description: string; icon: React.ReactNode;
  children: React.ReactNode; defaultOpen?: boolean; accentColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className={accentColor}>{icon}</span>
          <div>
            <p className="text-sm font-semibold leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        {open
          ? <ChevronDown  className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        }
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-border bg-background space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Sandbox user status table ─────────────────────────────────────────────────
type SandboxUser = {
  name: string; number: string; joined: boolean;
  sessionActive: boolean; lastMessageAt: string | null; failReason: string | null;
};

function SandboxStatusTable({ users, loading }: { users: SandboxUser[]; loading: boolean }) {
  if (loading) return (
    <div className="flex justify-center py-6">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );
  if (!users.length) return (
    <p className="text-sm text-muted-foreground text-center py-4">No users with WhatsApp numbers yet.</p>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="text-left py-2 pr-3 font-semibold">User</th>
            <th className="text-left py-2 pr-3 font-semibold">Number</th>
            <th className="text-left py-2 pr-3 font-semibold">Joined</th>
            <th className="text-left py-2 pr-3 font-semibold">Session</th>
            <th className="text-left py-2 font-semibold">Last Msg</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((u, i) => (
            <tr key={i} className="hover:bg-muted/30 transition-colors">
              <td className="py-2 pr-3 font-medium max-w-[100px] truncate">{u.name}</td>
              <td className="py-2 pr-3 font-mono text-muted-foreground">{u.number}</td>
              <td className="py-2 pr-3">
                {u.joined
                  ? <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><CheckCircle2 className="w-3 h-3" />Yes</span>
                  : <span className="flex items-center gap-1 text-red-500"><XCircle className="w-3 h-3" />No</span>
                }
              </td>
              <td className="py-2 pr-3">
                {u.sessionActive
                  ? <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px] px-1.5">Active</Badge>
                  : <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-[10px] px-1.5">Expired</Badge>
                }
              </td>
              <td className="py-2 text-muted-foreground">
                {u.lastMessageAt
                  ? new Date(u.lastMessageAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })
                  : '—'
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Warning for any expired/not-joined users */}
      {users.some(u => !u.joined || !u.sessionActive) && (
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              <strong>Users with expired/no session will not receive reminders</strong> until they
              message the sandbox again. Their reminders are skipped automatically — they won't
              waste an API call.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function WhatsAppQRDisplay() {
  const { user } = useAuthStore();

  const [connected, setConnected]           = useState<boolean | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null);
  const [copied, setCopied]                 = useState<'number' | 'code' | null>(null);

  const [testing, setTesting]               = useState(false);
  const [testResult, setTestResult]         = useState<{ ok: boolean; msg: string } | null>(null);

  const [triggering, setTriggering]         = useState(false);
  const [triggerResult, setTriggerResult]   = useState<{ ok: boolean; msg: string } | null>(null);

  const [sandboxUsers, setSandboxUsers]     = useState<SandboxUser[]>([]);
  const [sandboxLoading, setSandboxLoading] = useState(false);

  const isAdmin = (user as any)?.isAdmin === true;

  const fetchStatus = useCallback(async () => {
    try {
      const d = await api.get('/whatsapp/status');
      setConnected(d.connected);
      setSchedulerStatus(d.scheduler ?? null);
    } catch {
      setConnected(false);
    }
  }, []);

  const fetchSandboxUsers = useCallback(async () => {
    setSandboxLoading(true);
    try {
      const data = await api.get('/whatsapp/sandbox-status');
      setSandboxUsers(data);
    } catch {
      setSandboxUsers([]);
    } finally {
      setSandboxLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const copyText = async (text: string, type: 'number' | 'code') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const sendTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      await api.post('/whatsapp/test-message', {});
      setTestResult({ ok: true, msg: '✅ Test message sent! Check your WhatsApp.' });
    } catch (err: any) {
      setTestResult({ ok: false, msg: err?.error || 'Failed to send test message.' });
    } finally { setTesting(false); }
  };

  const triggerReminders = async () => {
    setTriggering(true); setTriggerResult(null);
    try {
      const r = await api.post('/whatsapp/trigger-reminders', {});
      setTriggerResult({
        ok: true,
        msg:
          `✅ Done! ${r.batches} batch(es) · Sent: ${r.sent} · Skipped: ${r.skipped} · ` +
          `Session expired: ${r.sessionExpired} · Not joined: ${r.notJoined} · Failed: ${r.failed}`,
      });
      // Refresh sandbox user table after a trigger run
      if (isAdmin) fetchSandboxUsers();
    } catch (err: any) {
      setTriggerResult({ ok: false, msg: err?.error || 'Failed to trigger reminders.' });
    } finally { setTriggering(false); }
  };

  if (connected === null) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Status banner ── */}
      <Card className={
        connected
          ? 'border-green-300 bg-green-50 dark:bg-green-950/40 dark:border-green-800'
          : 'border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800'
      }>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {connected
                ? <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                : <XCircle      className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              }
              <div>
                <CardTitle className="text-base">Twilio WhatsApp</CardTitle>
                <CardDescription className="text-xs">
                  {connected ? 'Credentials configured — reminders are active' : 'Credentials not configured'}
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchStatus} title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <Badge variant="secondary" className={
            connected
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
          }>
            {connected ? '🟢 Active' : '🟡 Not configured'}
          </Badge>
          {schedulerStatus && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
              <Clock className="w-3 h-3 shrink-0" />
              Scheduler: <strong>{schedulerStatus.running ? 'Running' : 'Stopped'}</strong>
              {schedulerStatus.nextMidnight && (
                <> · Next midnight run: <strong>{schedulerStatus.nextMidnight}</strong></>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Admin accordion sections ── */}
      {isAdmin && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">
            Admin Controls
          </p>

          {/* 1. Run reminder check */}
          <AccordionSection
            title="Run Reminder Check"
            description="Trigger midnight blast manually — same batching as the nightly cron"
            icon={<Play className="w-4 h-4" />}
            accentColor="text-orange-500"
          >
            <p className="text-xs text-muted-foreground leading-relaxed">
              Runs the same job as the nightly <strong>12:00 AM IST</strong> blast.
              Processes all users in batches of <strong>5</strong> with a 2-second pause between batches.
              Only users with an <strong>active sandbox session</strong> (messaged sandbox in last 23h) will receive messages.
              Expired/not-joined users are skipped and logged.
            </p>
            <Button
              onClick={triggerReminders}
              disabled={triggering || !connected}
              variant="outline"
              className="w-full border-orange-400/50 hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400"
            >
              {triggering
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running batches…</>
                : <><Play    className="w-4 h-4 mr-2" />Run Reminder Check Now</>
              }
            </Button>
            {!connected && (
              <p className="text-xs text-muted-foreground text-center">Configure Twilio credentials first.</p>
            )}
            {triggerResult && (
              <p className={`text-xs font-medium leading-relaxed ${triggerResult.ok ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                {triggerResult.msg}
              </p>
            )}
          </AccordionSection>

          {/* 2. Sandbox user status */}
          <AccordionSection
            title="Sandbox Session Status"
            description="See which users can receive messages right now"
            icon={<Users className="w-4 h-4" />}
            accentColor="text-blue-500"
            defaultOpen={false}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Users must have messaged the sandbox in the last 24h to receive reminders.
              </p>
              <Button size="sm" variant="ghost" onClick={fetchSandboxUsers} className="h-7 text-xs gap-1">
                <RefreshCw className="w-3 h-3" />Refresh
              </Button>
            </div>
            <SandboxStatusTable users={sandboxUsers} loading={sandboxLoading} />
            {!sandboxUsers.length && !sandboxLoading && (
              <Button size="sm" variant="outline" onClick={fetchSandboxUsers} className="w-full text-xs">
                Load User Status
              </Button>
            )}
          </AccordionSection>

          {/* 3. Send test message */}
          <AccordionSection
            title="Send Test Message"
            description="Verify Twilio by sending a WhatsApp message to your own number"
            icon={<Send className="w-4 h-4" />}
            accentColor="text-green-500"
          >
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sends a test WhatsApp message to the number saved in your profile.
              Make sure you have an active sandbox session (sent a message to the sandbox in the last 24h).
            </p>
            <Button onClick={sendTest} disabled={testing || !connected} className="w-full">
              {testing
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
                : 'Send Test Message to My Number'
              }
            </Button>
            {testResult && (
              <p className={`text-sm font-medium ${testResult.ok ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                {testResult.msg}
              </p>
            )}
          </AccordionSection>

          {/* 4. Sandbox opt-in instructions */}
          <AccordionSection
            title="Sandbox Opt-in & Webhook Setup"
            description="How users join + Twilio webhook configuration"
            icon={<MessageCircle className="w-4 h-4" />}
            accentColor="text-purple-500"
          >
            <div className="space-y-4">
              {/* Opt-in steps */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  User Opt-in Steps (one time per number)
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-medium">1. Save this number:</p>
                  <div className="flex items-center gap-2 p-2.5 bg-muted rounded-lg font-mono text-xs">
                    <span className="flex-1 select-all">{SANDBOX_NUMBER}</span>
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => copyText(SANDBOX_NUMBER, 'number')}>
                      {copied === 'number' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                  <p className="text-xs font-medium">2. Send this exact message on WhatsApp:</p>
                  <div className="flex items-center gap-2 p-2.5 bg-muted rounded-lg font-mono text-xs">
                    <span className="flex-1 select-all">{SANDBOX_CODE}</span>
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => copyText(SANDBOX_CODE, 'code')}>
                      {copied === 'code' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                  <p className="text-xs font-medium">3. Add WhatsApp number in Settings → WhatsApp.</p>
                  <p className="text-xs font-medium">4. Message the sandbox again every 24h to keep session alive.</p>
                </div>
              </div>

              {/* Webhook setup */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Twilio Webhook — Required for Auto Session Tracking
                </p>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Configure in Twilio Console:</strong><br />
                    Messaging → Try WhatsApp → Sandbox Configuration<br />
                    Set <em>"WHEN A MESSAGE COMES IN"</em> to:
                  </p>
                  <div className="font-mono text-xs bg-muted p-2 rounded select-all break-all">
                    https://your-backend.onrender.com/api/whatsapp/webhook
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    When a user messages the sandbox, this endpoint automatically marks their
                    session as active. This is what enables reminder delivery.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    <strong>Sandbox limit:</strong> Only joined numbers receive messages. Session expires after 24h.
                    For production, apply for WhatsApp Business API approval through Twilio.
                  </span>
                </p>
              </div>
            </div>
          </AccordionSection>
        </div>
      )}
    </div>
  );
}