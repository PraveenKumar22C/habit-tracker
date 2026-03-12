'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Loader2, ShieldX, RefreshCw } from 'lucide-react';

export function WhatsAppQRDisplay() {
  const { user } = useAuthStore();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isConnectedRef = useRef(false);

  const isAdmin = (user as any)?.isAdmin === true;

  useEffect(() => {
    if (!isAdmin) return;

    const poll = async () => {
      try {
        const res = await api.get('/whatsapp/qr');

        const connected: boolean = res.connected;
        const qr: string | null = res.qrCode ?? null;

        setIsConnected(connected);
        isConnectedRef.current = connected;
        setQrCode(qr);
        setError(null);
        setLastUpdated(new Date());

        return connected;
      } catch (err: any) {
        setError(err?.error || 'Failed to fetch WhatsApp status');
        return false;
      } finally {
        setLoading(false);
      }
    };

    poll();

    const interval = setInterval(async () => {
      if (isConnectedRef.current) {
        clearInterval(interval);
        return;
      }
      await poll();
    }, 5000);

    return () => clearInterval(interval);
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-6 text-muted-foreground">
          <ShieldX className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">WhatsApp QR setup is only available to admins.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Authentication</CardTitle>
          <CardDescription>Checking connection status…</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (isConnected) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            <div>
              <CardTitle>WhatsApp Connected</CardTitle>
              <CardDescription>Ready to send reminders to all users</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          >
            Status: Active
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
      <CardHeader>
        <CardTitle>WhatsApp Setup Required</CardTitle>
        <CardDescription>Scan the QR code below to link the bot account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900 rounded-lg text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {qrCode ? (
          <>
            <div className="bg-white p-4 rounded-xl flex justify-center shadow-sm">
              <img
                key={qrCode}
                src={qrCode}
                alt="WhatsApp QR Code"
                width={256}
                height={256}
                className="rounded-md"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-sm text-blue-700 dark:text-blue-300">
              <p className="font-semibold mb-2">How to link:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open WhatsApp on the bot phone</li>
                <li>Go to <strong>Settings → Linked Devices</strong></li>
                <li>Tap <strong>"Link a Device"</strong></li>
                <li>Point the camera at this QR code</li>
              </ol>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="w-3 h-3" />
              <span>
                QR refreshes every 5 seconds to stay valid.
                {lastUpdated && (
                  <> Last updated: {lastUpdated.toLocaleTimeString()}</>
                )}
              </span>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-3" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Waiting for QR code from server…
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}