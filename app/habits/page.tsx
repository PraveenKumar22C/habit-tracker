"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore, useHabitStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/Layout";
import HabitCard from "@/components/HabitCard";

export default function HabitsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { habits, setHabits, loading } = useHabitStore();

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchHabits = async () => {
      try {
        const data = await api.habits.getAll();
        setHabits(data);
      } catch (error) {
        console.error("Failed to fetch habits:", error);
      }
    };

    fetchHabits();
  }, [token, router, setHabits]);

  const activeHabits = habits.filter((h) => h.isActive);
  const inactiveHabits = habits.filter((h) => !h.isActive);

  return (
    <Layout>
      <div className="space-y-8">
        <div className="relative flex flex-col md:flex-row md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold">My Habits</h1>
            <p className="text-muted-foreground">
              Manage and track all your habits
            </p>
          </div>

          <div className="md:absolute" style={{ right: "20px" }}>
            <Link href="/habits/new">
              <Button className="w-full md:w-auto bg-primary hover:bg-primary/90">
                + Add New Habit
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Active Habits</h2>
            <p className="text-muted-foreground">
              {activeHabits.length} habit{activeHabits.length !== 1 ? "s" : ""}
            </p>
          </div>

          {activeHabits.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground mb-4">
                  No active habits yet
                </p>
                <Link href="/habits/new">
                  <Button>Create Your First Habit</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeHabits.map((habit) => (
                <HabitCard key={habit._id} habit={habit} />
              ))}
            </div>
          )}
        </div>

        {inactiveHabits.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Paused Habits</h2>
              <p className="text-muted-foreground">
                {inactiveHabits.length} habit
                {inactiveHabits.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inactiveHabits.map((habit) => (
                <HabitCard key={habit._id} habit={habit} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
