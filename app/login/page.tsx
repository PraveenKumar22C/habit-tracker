"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/lib/store";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FieldError } from "@/components/Fielderror";
import { validateEmail, validatePassword } from "@/lib/validations";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBlur = (field: "email" | "password") => {
    setTouched((t) => ({ ...t, [field]: true }));
    if (field === "email") {
      const r = validateEmail(email);
      setFieldErrors((e) => ({ ...e, email: r.valid ? "" : r.message }));
    }
    if (field === "password") {
      const r = validatePassword(password);
      setFieldErrors((e) => ({ ...e, password: r.valid ? "" : r.message }));
    }
  };

  const validate = (): boolean => {
    const emailErr = validateEmail(email).message;
    const passErr = validatePassword(password).message;
    setFieldErrors({ email: emailErr, password: passErr });
    return !emailErr && !passErr;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setTouched({ email: true, password: true });

    if (!validate()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setFormError(
          data.error || "Invalid email or password. Please try again.",
        );
        return;
      }

      login(data.token, data.user);
      router.push("/dashboard");
    } catch {
      setFormError("Network error. Please try again.");
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
            Welcome back — sign in to continue
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
                Or continue with email
              </span>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            {formError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive text-center">
                {formError}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Email *
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched.email) {
                    const r = validateEmail(e.target.value);
                    setFieldErrors((err) => ({
                      ...err,
                      email: r.valid ? "" : r.message,
                    }));
                  }
                }}
                onBlur={() => handleBlur("email")}
                aria-invalid={!!fieldErrors.email}
                className={`h-11 bg-muted/40 border-border/60 focus:border-primary focus:bg-background transition-colors placeholder:text-muted-foreground/40 ${
                  fieldErrors.email
                    ? "border-destructive focus:border-destructive"
                    : ""
                }`}
              />
              <FieldError message={fieldErrors.email} />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Password *
              </label>
              <Input
                id="password"
                type="password"
                placeholder="e.g. Chandu@13k"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touched.password) {
                    const r = validatePassword(e.target.value);
                    setFieldErrors((err) => ({
                      ...err,
                      password: r.valid ? "" : r.message,
                    }));
                  }
                }}
                onBlur={() => handleBlur("password")}
                aria-invalid={!!fieldErrors.password}
                maxLength={13}
                className={`h-11 bg-muted/40 border-border/60 focus:border-primary focus:bg-background transition-colors placeholder:text-muted-foreground/40 ${
                  fieldErrors.password
                    ? "border-destructive focus:border-destructive"
                    : ""
                }`}
              />
              <FieldError message={fieldErrors.password} />
              {/* Hint shown only before the field is touched */}
              {!touched.password && (
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  8–13 chars · uppercase · number · special character
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold tracking-wide text-sm mt-1"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground pt-1">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-primary font-semibold hover:underline underline-offset-4"
            >
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
