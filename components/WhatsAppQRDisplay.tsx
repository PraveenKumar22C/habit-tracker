'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, MessageCircle, Copy, Check } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

const SANDBOX_NUMBER = process.env.NEXT_PUBLIC_TWILIO_SANDBOX_NUMBER || '+14155238886';
const SANDBOX_CODE   = process.env.NEXT_PUBLIC_TWILIO_SANDBOX_CODE   || 'join scientific-lungs';

export function WhatsAppQRDisplay() {
  const { user } = useAuthStore();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [copied, setCopied]       = useState(false);
  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const isAdmin = (user as any)?.isAdmin === true;

  useEffect(() => {
    api.get('/whatsapp/status')
      .then(d => setConnected(d.connected))
      .catch(() => setConnected(false));
  }, []);

  const copyCode = async () => {
    await navigator.clipboard.writeText(SANDBOX_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await api.post('/whatsapp/test-message', {});
      setTestResult({ ok: true, msg: 'Test message sent! Check your WhatsApp.' });
    } catch (err: any) {
      setTestResult({ ok: false, msg: err?.error || 'Failed to send test message.' });
    } finally {
      setTesting(false);
    }
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
      {/* Status card */}
      <Card className={connected
        ? 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800'
        : 'border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800'
      }>
        <CardHeader>
          <div className="flex items-center gap-3">
            {connected
              ? <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              : <XCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            }
            <div>
              <CardTitle>Twilio WhatsApp</CardTitle>
              <CardDescription>
                {connected ? 'Credentials configured — reminders are active' : 'Credentials not configured'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary" className={connected
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
          }>
            {connected ? 'Active' : 'Not configured'}
          </Badge>
        </CardContent>
      </Card>

      {/* Sandbox opt-in instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            How users opt in (Sandbox)
          </CardTitle>
          <CardDescription>
            Each user must send one WhatsApp message to activate reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm font-medium">Step 1 — Save this number in your phone:</p>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
              <span className="flex-1">{SANDBOX_NUMBER}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { navigator.clipboard.writeText(SANDBOX_NUMBER); }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-sm font-medium">Step 2 — Send this exact message on WhatsApp:</p>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
              <span className="flex-1">{SANDBOX_CODE}</span>
              <Button size="sm" variant="ghost" onClick={copyCode}>
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <p className="text-sm font-medium">Step 3 — Make sure your WhatsApp number is saved in Settings → Profile</p>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm text-blue-700 dark:text-blue-300">
            <p className="font-semibold mb-1">ℹ️ Sandbox limitation</p>
            <p>Each user must opt in once. After opt-in, reminders work automatically. This is a Twilio Sandbox restriction — upgrade to a paid Twilio number to remove it.</p>
          </div>

          {/* Admin test button */}
          {isAdmin && (
            <div className="pt-2 space-y-2">
              <Button onClick={sendTest} disabled={testing || !connected} className="w-full">
                {testing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : 'Send Test Message to My Number'}
              </Button>
              {testResult && (
                <p className={`text-sm text-center ${testResult.ok ? 'text-green-600' : 'text-destructive'}`}>
                  {testResult.msg}
                </p>
              )}
              {!connected && (
                <p className="text-xs text-muted-foreground text-center">
                  Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM to your Render env vars
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}