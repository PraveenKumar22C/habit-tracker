'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Loader2, ShieldX } from 'lucide-react';

export function WhatsAppQRDisplay() {
  const { user } = useAuthStore();
  const [qrCode, setQrCode]           = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [expiresIn, setExpiresIn]     = useState(0);
  const [waitingForQR, setWaiting]    = useState(false);

  const connectedRef   = useRef(false);
  const pollRef        = useRef<NodeJS.Timeout | null>(null);
  const countdownRef   = useRef<NodeJS.Timeout | null>(null);

  const isAdmin = (user as any)?.isAdmin === true;

  const startCountdown = useCallback((seconds: number) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setExpiresIn(seconds);
    countdownRef.current = setInterval(() => {
      setExpiresIn(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const doPoll = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp/qr');
      setError(null);

      if (res.connected) {
        setIsConnected(true);
        connectedRef.current = true;
        setQrCode(null);
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (pollRef.current)      clearInterval(pollRef.current);
        setLoading(false);
        return;
      }

      setIsConnected(false);
      connectedRef.current = false;

      if (res.qrCode) {
        setQrCode(res.qrCode);
        setWaiting(false);
        startCountdown(res.expiresIn ?? 55);
      } else {
        setQrCode(null);
        setWaiting(true);
      }
    } catch (err: any) {
      setError(err?.error || 'Failed to fetch WhatsApp status');
    } finally {
      setLoading(false);
    }
  }, [startCountdown]);

  useEffect(() => {
    if (!isAdmin) return;
    doPoll();
    // Poll every 3s so we always have the freshest QR before it expires
    pollRef.current = setInterval(() => {
      if (connectedRef.current) { clearInterval(pollRef.current!); return; }
      doPoll();
    }, 3000);
    return () => {
      if (pollRef.current)    clearInterval(pollRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isAdmin, doPoll]);

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
        <CardContent className="flex justify-center py-10">
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
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
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
        <CardDescription>Scan the QR code with WhatsApp to link the bot</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900 rounded-lg text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {qrCode && expiresIn > 0 ? (
          <>
            <div className="bg-white p-4 rounded-xl flex flex-col items-center gap-3 shadow-sm">
              <img
                key={qrCode}
                src={qrCode}
                alt="WhatsApp QR Code"
                width={300}
                height={300}
                className="rounded-md"
              />
              {/* Countdown bar */}
              <div className="w-full space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Valid for</span>
                  <span className={`font-medium ${expiresIn <= 10 ? 'text-red-500 font-bold' : ''}`}>
                    {expiresIn}s
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      expiresIn <= 10 ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${(expiresIn / 55) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-sm text-blue-700 dark:text-blue-300">
              <p className="font-semibold mb-2">How to scan:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open WhatsApp on your phone</li>
                <li>Go to <strong>Settings → Linked Devices</strong></li>
                <li>Tap <strong>"Link a Device"</strong></li>
                <li>Scan this QR code</li>
              </ol>
              <p className="mt-2 text-xs opacity-75">
                Once linked, you won't need to scan again — even after server restarts.
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-8 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {waitingForQR
                ? 'Waiting for QR code from server…'
                : 'QR expired — new one arriving shortly…'}
            </p>
            <p className="text-xs text-muted-foreground">Refreshing automatically every 3 seconds</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}