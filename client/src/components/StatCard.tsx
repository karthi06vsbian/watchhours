import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  accent: "blue" | "green" | "yellow" | "red";
  icon: LucideIcon;
}

const accentMap = {
  blue: "text-neonBlue",
  green: "text-neonGreen",
  yellow: "text-signalYellow",
  red: "text-alertRed"
};

export function StatCard({ label, value, accent, icon: Icon }: StatCardProps) {
  return (
    <motion.div
      layout
      className="glass rounded-lg border border-white/10 p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</span>
        <Icon className={`h-5 w-5 ${accentMap[accent]}`} />
      </div>
      <motion.div
        key={value}
        initial={{ opacity: 0.2, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mt-3 font-mono text-2xl font-semibold ${accentMap[accent]}`}
      >
        {value}
      </motion.div>
    </motion.div>
  );
}
