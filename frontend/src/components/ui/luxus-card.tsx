import type { ReactNode } from "react";

export function LuxusCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-luxus-border bg-luxus-card p-6 shadow-card ${className}`}
    >
      {children}
    </div>
  );
}
