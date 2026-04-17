"use client";

import { useEffect, useState } from "react";
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
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRefreshUser } from "@/lib/useRefreshUser";

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useRefreshUser();

  useEffect(() => { setMounted(true); }, []);

  // Auto-close sidebar on desktop resize to mobile
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setSidebarOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!token) router.push("/login");
  }, [token, router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!token) return null;

  const navLinks = [
    { href: "/dashboard", icon: <Home size={18} />, label: "Dashboard", active: pathname === "/dashboard" },
    { href: "/habits",    icon: <Activity size={18} />, label: "Habits", active: pathname.startsWith("/habits") },
    { href: "/analytics", icon: <TrendingUp size={18} />, label: "Analytics", active: pathname === "/analytics" },
    { href: "/settings",  icon: <Settings size={18} />, label: "Settings", active: pathname === "/settings" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          style={{ animation: "fadeIn 0.2s ease" }}
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-50
          bg-sidebar border-r border-sidebar-border
          flex flex-col
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? "w-64 shadow-2xl" : "w-0 overflow-hidden border-r-0"}
        `}
        style={{
          boxShadow: sidebarOpen ? "4px 0 24px rgba(0,0,0,0.15)" : "none",
        }}
      >
        <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 shrink-0 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/30">
              ✓
            </div>
            <span className="font-extrabold text-xl whitespace-nowrap tracking-tight">
              HabitTrack
            </span>
          </div>
          <button
            onClick={toggleSidebar}
            className="md:hidden p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navLinks.slice(0, 3).map((link) => (
            <SideNavLink key={link.href} {...link} onClick={toggleSidebar} />
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <SideNavLink {...navLinks[3]} onClick={toggleSidebar} />
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>

        {user && (
          <div className="px-4 pb-4">
            <div className="p-3 rounded-xl bg-muted/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <header
          className={`
            bg-card border-b border-border h-14 sm:h-16 flex items-center px-3 sm:px-6 justify-between
            sticky top-0 z-30 transition-all duration-200
            ${scrolled ? "shadow-md" : "shadow-none"}
          `}
          style={{
            backdropFilter: scrolled ? "blur(12px)" : "none",
            backgroundColor: scrolled ? "var(--card)" : "var(--card)",
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="shrink-0 text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all duration-200 text-sm sm:text-base"
            >
              <Menu size={20} />
            </Button>
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {navLinks.find((l) => l.active)?.label ?? "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold leading-none">{user?.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
            </div>
            <ThemeToggle />
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm shadow-sm cursor-pointer hover:shadow-primary/40 hover:shadow-md transition-all"
              title={user?.name}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-background">
          <div className="p-3 sm:p-6 max-w-7xl mx-auto pb-20 sm:pb-6">
            {children}
          </div>
        </main>

        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border flex items-center justify-around px-2 py-1 safe-bottom">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 ${
                link.active
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`transition-transform duration-200 ${link.active ? "scale-110" : ""}`}>
                {link.icon}
              </span>
              <span className="text-[10px] font-semibold">{link.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function SideNavLink({
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
      <div
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
          transition-all duration-200 cursor-pointer
          ${
            active
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
              : "text-sidebar-foreground hover:bg-blue-500/10 hover:text-blue-500"
          }
        `}
      >
        <span className={`transition-transform duration-200 ${active ? "scale-110" : ""}`}>
          {icon}
        </span>
        <span>{label}</span>
        {active && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground/70" />
        )}
      </div>
    </Link>
  );
}
