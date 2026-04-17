"use client";

import { useEffect, useState, useRef } from "react";
import { Flame, X, Star, Zap } from "lucide-react";

interface StreakCelebrationProps {
  streak: number;
  habitName: string;
  onClose: () => void;
}

// Confetti particle
function Particle({
  x,
  y,
  color,
  size,
  velocity,
  rotation,
  rotationSpeed,
}: {
  x: number;
  y: number;
  color: string;
  size: number;
  velocity: { x: number; y: number };
  rotation: number;
  rotationSpeed: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? "50%" : "2px",
        transform: `rotate(${rotation}deg)`,
        opacity: 0,
        animation: `confettiFall ${1.5 + Math.random()}s ease-out forwards`,
      }}
    />
  );
}

const CONFETTI_COLORS = [
  "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6",
  "#10b981", "#f97316", "#ec4899", "#06b6d4",
];

export function StreakCelebration({ streak, habitName, onClose }: StreakCelebrationProps) {
  const [visible, setVisible] = useState(false);
  const [animPhase, setAnimPhase] = useState<"enter" | "show" | "exit">("enter");
  const [displayedStreak, setDisplayedStreak] = useState(0);
  const [particles, setParticles] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const milestones = [3, 7, 14, 21, 30, 60, 100];
  const isMilestone = milestones.includes(streak);

  useEffect(() => {
    // Generate confetti particles
    const newParticles = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: -20,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 10,
      velocity: { x: (Math.random() - 0.5) * 4, y: 2 + Math.random() * 4 },
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
    }));
    setParticles(newParticles);

    // Animate in
    requestAnimationFrame(() => {
      setVisible(true);
      setAnimPhase("enter");
    });

    setTimeout(() => setAnimPhase("show"), 100);

    // Count up streak number
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setDisplayedStreak(count);
      if (count >= streak) clearInterval(interval);
    }, Math.max(30, 600 / streak));

    // Auto close after 4s
    const timeout = setTimeout(() => {
      setAnimPhase("exit");
      setTimeout(onClose, 500);
    }, 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [streak, onClose]);

  const handleClose = () => {
    setAnimPhase("exit");
    setTimeout(onClose, 500);
  };

  const getStreakLabel = () => {
    if (streak >= 100) return "Century! 🏆";
    if (streak >= 30) return "Month Master! 💎";
    if (streak >= 21) return "21-Day Champion! 🥇";
    if (streak >= 14) return "2-Week Warrior! ⚡";
    if (streak >= 7) return "Week Streak! 🔥";
    if (streak >= 3) return `${streak} Day Streak! 🎯`;
    return `${streak} Day Streak!`;
  };

  const getBgGradient = () => {
    if (streak >= 30) return "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)";
    if (streak >= 14) return "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1d4ed8 100%)";
    if (streak >= 7) return "linear-gradient(135deg, #0c1a0c 0%, #14532d 50%, #16a34a 100%)";
    return "linear-gradient(135deg, #0c0a1e 0%, #1e1040 50%, #7c3aed 100%)";
  };

  const getGlowColor = () => {
    if (streak >= 30) return "#6366f1";
    if (streak >= 14) return "#3b82f6";
    if (streak >= 7) return "#10b981";
    return "#a855f7";
  };

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(600px) rotate(720deg); }
        }
        @keyframes streakPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes streakNumberPop {
          0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.2) rotate(3deg); opacity: 1; }
          80% { transform: scale(0.95) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 30px var(--glow), 0 0 60px var(--glow), 0 0 120px var(--glow); }
          50% { box-shadow: 0 0 50px var(--glow), 0 0 100px var(--glow), 0 0 200px var(--glow); }
        }
        @keyframes ringExpand {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(4); opacity: 0; }
        }
        @keyframes slideUp {
          0% { transform: translateY(40px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes shimmerStreak {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes starFloat {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-80px) scale(0); opacity: 0; }
        }
        @keyframes backdropIn {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(16px); }
        }
        @keyframes backdropOut {
          from { opacity: 1; backdrop-filter: blur(16px); }
          to { opacity: 0; backdrop-filter: blur(0px); }
        }
        @keyframes cardIn {
          from { transform: scale(0.7) translateY(60px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes cardOut {
          from { transform: scale(1) translateY(0); opacity: 1; }
          to { transform: scale(0.8) translateY(-40px); opacity: 0; }
        }
        @keyframes flameWiggle {
          0%, 100% { transform: rotate(-5deg) scale(1); }
          25% { transform: rotate(5deg) scale(1.1); }
          50% { transform: rotate(-3deg) scale(1.05); }
          75% { transform: rotate(4deg) scale(1.08); }
        }
        @keyframes checkmarkDraw {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes badgeSlide {
          from { transform: translateX(-30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.7)",
          animation: animPhase === "exit" ? "backdropOut 0.5s ease forwards" : "backdropIn 0.3s ease forwards",
        }}
        onClick={handleClose}
      >
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {particles.map((p) => (
            <Particle key={p.id} {...p} />
          ))}
        </div>

        <div
          ref={containerRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: getBgGradient(),
            borderRadius: "28px",
            padding: "48px 40px",
            maxWidth: "400px",
            width: "90%",
            position: "relative",
            textAlign: "center",
            animation: animPhase === "exit" ? "cardOut 0.5s cubic-bezier(0.4,0,0.6,1) forwards" : "cardIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards",
            // @ts-ignore
            "--glow": getGlowColor(),
            animationName: animPhase === "exit" ? "cardOut" : "cardIn",
          }}
        >
          <div style={{
            position: "absolute",
            inset: -1,
            borderRadius: "29px",
            border: `2px solid ${getGlowColor()}60`,
            animation: `glowPulse 2s ease-in-out infinite`,
            // @ts-ignore
            "--glow": getGlowColor() + "80",
          }} />

          <div style={{
            position: "absolute",
            inset: 0,
            borderRadius: "28px",
            border: `3px solid ${getGlowColor()}`,
            animation: "ringExpand 1.5s ease-out 0.3s infinite",
          }} />

          <button
            onClick={handleClose}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "rgba(255,255,255,0.7)",
              transition: "background 0.2s",
            }}
          >
            <X size={16} />
          </button>

          <div style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 20,
            animation: "slideUp 0.5s ease 0.2s both",
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${getGlowColor()}, ${getGlowColor()}aa)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 0 8px ${getGlowColor()}20,  0 0 0 16px ${getGlowColor()}10`,
            }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path
                  d="M8 16l6 6 10-12"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="100"
                  style={{ animation: "checkmarkDraw 0.6s ease 0.4s both" }}
                />
              </svg>
            </div>
          </div>

          <div style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "13px",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: 8,
            animation: "slideUp 0.5s ease 0.3s both",
          }}>
            Habit Checked In
          </div>

          <div style={{
            color: "rgba(255,255,255,0.9)",
            fontSize: "18px",
            fontWeight: 700,
            marginBottom: 24,
            animation: "slideUp 0.5s ease 0.35s both",
          }}>
            {habitName}
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginBottom: 16,
            animation: "streakNumberPop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.5s both",
          }}>
            <Flame
              size={48}
              style={{
                color: "#f97316",
                filter: "drop-shadow(0 0 12px #f9731680)",
                animation: "flameWiggle 0.8s ease-in-out 0.8s infinite",
              }}
            />
            <div>
              <span style={{
                fontSize: "72px",
                fontWeight: 900,
                lineHeight: 1,
                background: `linear-gradient(135deg, #fff 0%, ${getGlowColor()} 100%)`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
                display: "block",
              }}>
                {displayedStreak}
              </span>
            </div>
            <Flame
              size={48}
              style={{
                color: "#f97316",
                filter: "drop-shadow(0 0 12px #f9731680)",
                animation: "flameWiggle 0.8s ease-in-out 0.9s infinite",
              }}
            />
          </div>

          <div style={{
            color: "white",
            fontSize: "22px",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            marginBottom: 12,
            animation: "slideUp 0.5s ease 0.8s both",
          }}>
            {getStreakLabel()}
          </div>

          {isMilestone && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: `linear-gradient(135deg, ${getGlowColor()}30, ${getGlowColor()}10)`,
              border: `1px solid ${getGlowColor()}60`,
              borderRadius: "100px",
              padding: "6px 16px",
              marginBottom: 16,
              animation: "badgeSlide 0.5s ease 1s both",
            }}>
              <Star size={14} style={{ color: "#fbbf24" }} />
              <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "13px", fontWeight: 600 }}>
                Milestone Reached!
              </span>
              <Zap size={14} style={{ color: "#fbbf24" }} />
            </div>
          )}

          <div style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: "14px",
            lineHeight: 1.6,
            animation: "slideUp 0.5s ease 1.1s both",
          }}>
            {streak === 1 ? "Great start! Keep it going! 🚀" :
             streak < 5 ? "You're building momentum! 💪" :
             streak < 10 ? "You're on fire! Don't break it! 🔥" :
             streak < 30 ? "Incredible consistency! You're unstoppable! ⚡" :
             "You are a habit master! Legendary! 🏆"}
          </div>
        </div>
      </div>
    </>
  );
}
