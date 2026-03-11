'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Flame, TrendingUp, Calendar, Trophy } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setToken(storedToken);

    if (storedToken) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted">
      <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
              ✓
            </div>
            <span className="text-xl font-bold">HabitTrack</span>
          </div>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-primary hover:bg-primary/90">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-5xl sm:text-6xl font-bold text-foreground text-balance">
            Build Better Habits, Celebrate Your Progress
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Track your daily habits, visualize your streaks, and reach your goals with beautiful analytics and motivating milestones.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link href="/register">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Start Free Today
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Already a member?
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6 py-16">
          <Feature
            icon={<Flame className="w-8 h-8 text-orange-500" />}
            title="Track Streaks"
            description="Monitor your daily streaks and celebrate milestones at 3, 7, 21, 30, and 100 days"
          />
          <Feature
            icon={<TrendingUp className="w-8 h-8 text-blue-500" />}
            title="Analytics"
            description="View detailed insights with daily, weekly, and monthly progress charts"
          />
          <Feature
            icon={<Calendar className="w-8 h-8 text-green-500" />}
            title="Heatmap"
            description="GitHub-style contribution heatmap showing your activity throughout the year"
          />
          <Feature
            icon={<Trophy className="w-8 h-8 text-purple-500" />}
            title="Milestones"
            description="Get celebrated for reaching important streaks and completing habits"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-8 py-16 text-center">
          <div>
            <div className="text-4xl font-bold text-primary">100%</div>
            <p className="text-muted-foreground mt-2">Privacy First</p>
            <p className="text-sm text-muted-foreground">Your data stays yours</p>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary">Free</div>
            <p className="text-muted-foreground mt-2">Forever</p>
            <p className="text-sm text-muted-foreground">No hidden fees</p>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary">Open</div>
            <p className="text-muted-foreground mt-2">Source</p>
            <p className="text-sm text-muted-foreground">Transparent & hackable</p>
          </div>
        </div>
      </div>

      <footer className="border-t border-border py-8 text-center text-muted-foreground">
        <p className="max-w-7xl mx-auto">© 2024 HabitTrack. Start building better habits today.</p>
      </footer>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
