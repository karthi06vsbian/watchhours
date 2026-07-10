import type { PropsWithChildren } from "react";

interface GlassCardProps extends PropsWithChildren {
  className?: string;
}

export function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <section className={`glass rounded-lg border border-white/10 p-4 shadow-neon ${className}`}>
      {children}
    </section>
  );
}
