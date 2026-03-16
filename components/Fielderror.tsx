"use client";

interface FieldErrorProps {
  message?: string;
  className?: string;
}

export function FieldError({ message, className = "" }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p
      className={`text-xs text-destructive mt-1 flex items-center gap-1 ${className}`}
    >
      <span aria-hidden>⚠</span> {message}
    </p>
  );
}
