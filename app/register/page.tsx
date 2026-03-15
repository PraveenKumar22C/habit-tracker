'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { useAuthStore } from '@/lib/store';
import { GoogleSignIn } from '@/components/GoogleSignIn';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FieldError } from '@/components/Fielderror';
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateName,
  passwordStrength,
} from '@/lib/validations';

type Fields = 'name' | 'email' | 'password' | 'confirmPassword';

function PasswordChecklist({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    { label: '8–13 characters',               ok: password.length >= 8 && password.length <= 13 },
    { label: 'One uppercase letter (A–Z)',     ok: /[A-Z]/.test(password) },
    { label: 'One number (0–9)',              ok: /[0-9]/.test(password) },
    { label: 'One special character (!@#…)',  ok: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <ul className="mt-1.5 space-y-0.5">
      {checks.map(c => (
        <li
          key={c.label}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            c.ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
          }`}
        >
          <span className="w-3 text-center">{c.ok ? '✓' : '○'}</span>
          {c.label}
        </li>
      ))}
    </ul>
  );
}

function StrengthBar({ password }: { password: string }) {
  if (!password) return null;

  const strength = passwordStrength(password);
  const config = {
    weak:   { width: 'w-1/4',  color: 'bg-red-500',    text: 'text-red-500',    label: 'Weak'   },
    fair:   { width: 'w-2/4',  color: 'bg-yellow-500', text: 'text-yellow-600', label: 'Fair'   },
    strong: { width: 'w-full', color: 'bg-green-500',  text: 'text-green-600',  label: 'Strong' },
    empty:  { width: 'w-0',    color: '',              text: '',                label: ''       },
  }[strength];

  return (
    <div className="mt-1.5 space-y-0.5">
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${config.width} ${config.color}`}
        />
      </div>
      <p className={`text-xs font-medium ${config.text}`}>{config.label}</p>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<Fields, string>>({
    name: '', email: '', password: '', confirmPassword: '',
  });
  const [touched, setTouched] = useState<Record<Fields, boolean>>({
    name: false, email: false, password: false, confirmPassword: false,
  });
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateField = (field: Fields, value: string): string => {
    switch (field) {
      case 'name':            return validateName(value).message;
      case 'email':           return validateEmail(value).message;
      case 'password':        return validatePassword(value).message;
      case 'confirmPassword': return validateConfirmPassword(form.password, value).message;
      default: return '';
    }
  };

  const handleChange = (field: Fields, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    if (touched[field]) {
      setErrors(e => ({ ...e, [field]: validateField(field, value) }));
      if (field === 'password' && touched.confirmPassword) {
        setErrors(e => ({
          ...e,
          confirmPassword: validateConfirmPassword(value, form.confirmPassword).message,
        }));
      }
    }
  };

  const handleBlur = (field: Fields) => {
    setTouched(t => ({ ...t, [field]: true }));
    setErrors(e => ({ ...e, [field]: validateField(field, form[field]) }));
  };

  const validateAll = (): boolean => {
    const errs: Record<Fields, string> = {
      name:            validateName(form.name).message,
      email:           validateEmail(form.email).message,
      password:        validatePassword(form.password).message,
      confirmPassword: validateConfirmPassword(form.password, form.confirmPassword).message,
    };
    setErrors(errs);
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    return !Object.values(errs).some(Boolean);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!validateAll()) return;

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:     form.name.trim(),
          email:    form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.toLowerCase().includes('email')) {
          setErrors(e => ({ ...e, email: data.error }));
        } else {
          setFormError(data.error || 'Registration failed. Please try again.');
        }
        return;
      }

      login(data.token, data.user);
      router.push('/dashboard');
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-3xl font-bold text-center tracking-tight">
            <span className="bg-gradient-to-r from-primary via-primary/70 to-primary bg-clip-text text-transparent">
              HabitTrack
            </span>
          </CardTitle>
          <CardDescription className="text-center text-sm text-muted-foreground">
            Create your account to get started
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-0">

          <GoogleSignIn />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground tracking-wider">
                Or sign up with email
              </span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4" noValidate>
            {formError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive text-center">
                {formError}
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-1">
              <label htmlFor="name" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Full Name *
              </label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                maxLength={80}
                aria-invalid={!!errors.name}
                className={`h-11 bg-muted/40 border-border/60 focus:border-primary focus:bg-background transition-colors placeholder:text-muted-foreground/40 ${
                  errors.name ? 'border-destructive focus:border-destructive' : ''
                }`}
              />
              <FieldError message={errors.name} />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Email *
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                aria-invalid={!!errors.email}
                className={`h-11 bg-muted/40 border-border/60 focus:border-primary focus:bg-background transition-colors placeholder:text-muted-foreground/40 ${
                  errors.email ? 'border-destructive focus:border-destructive' : ''
                }`}
              />
              <FieldError message={errors.email} />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Password *
              </label>
              <Input
                id="password"
                type="password"
                placeholder="e.g. Chandu@13k"
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                maxLength={13}
                aria-invalid={!!errors.password}
                className={`h-11 bg-muted/40 border-border/60 focus:border-primary focus:bg-background transition-colors placeholder:text-muted-foreground/40 ${
                  errors.password ? 'border-destructive focus:border-destructive' : ''
                }`}
              />
              {/* Live strength bar + checklist — shown as soon as typing starts */}
              <StrengthBar password={form.password} />
              <PasswordChecklist password={form.password} />
              {/* Error message shown only after blur or submit attempt */}
              {errors.password && <FieldError message={errors.password} />}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label htmlFor="confirm-password" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Confirm Password *
              </label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={e => handleChange('confirmPassword', e.target.value)}
                onBlur={() => handleBlur('confirmPassword')}
                maxLength={13}
                aria-invalid={!!errors.confirmPassword}
                className={`h-11 bg-muted/40 border-border/60 focus:border-primary focus:bg-background transition-colors placeholder:text-muted-foreground/40 ${
                  errors.confirmPassword ? 'border-destructive focus:border-destructive' : ''
                }`}
              />
              <FieldError message={errors.confirmPassword} />
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold tracking-wide text-sm mt-1"
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground pt-1">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline underline-offset-4">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}