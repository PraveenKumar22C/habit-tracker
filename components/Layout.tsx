"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore, useUIStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Menu,
  LogOut,
  Settings,
  Home,
  Activity,
  TrendingUp,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
  }, [token, router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!token) {
    return null;
  }

  return (
    <div className="flex h-screen">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-50
          bg-sidebar border-r border-sidebar-border
          flex flex-col
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? "w-64" : "w-0 overflow-hidden border-r-0"}
        `}
      >
        <div className="p-4 border-b border-sidebar-border flex items-center">
          <div className="w-10 h-10 shrink-0 bg-sidebar-primary rounded-lg flex items-center justify-center text-sidebar-primary-foreground font-bold text-xl">
            ✓
          </div>
          <span className="ml-3 font-bold text-xl whitespace-nowrap">
            HabitTrack
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavLink
            href="/dashboard"
            icon={<Home size={20} />}
            label="Dashboard"
            active={pathname === "/dashboard"}
            onClick={toggleSidebar}
          />
          <NavLink
            href="/habits"
            icon={<Activity size={20} />}
            label="Habits"
            active={pathname.startsWith("/habits")}
            onClick={toggleSidebar}
          />
          <NavLink
            href="/analytics"
            icon={<TrendingUp size={20} />}
            label="Analytics"
            active={pathname === "/analytics"}
            onClick={toggleSidebar}
          />
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-2">
          <NavLink
            href="/settings"
            icon={<Settings size={20} />}
            label="Settings"
            active={pathname === "/settings"}
            onClick={toggleSidebar}
          />
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-primary hover:text-primary-foreground"
            onClick={handleLogout}
          >
            <LogOut size={20} />
            <span className="ml-2">Logout</span>
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="bg-card border-b border-border h-16 flex items-center px-6 justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-foreground hover:bg-muted"
          >
            <Menu size={20} />
          </Button>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <ThemeToggle />
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-background">
          <div className="p-6 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick}>
      <Button
        variant="ghost"
        className={`w-full justify-start transition-colors hover:bg-primary hover:text-primary-foreground ${
          active
            ? "bg-primary text-primary-foreground font-semibold"
            : "text-sidebar-foreground"
        }`}
      >
        {icon}
        <span className="ml-2 whitespace-nowrap">{label}</span>
      </Button>
    </Link>
  );
}
