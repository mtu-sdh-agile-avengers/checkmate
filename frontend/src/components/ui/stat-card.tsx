import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type StatCardProps = {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  note?: string;
  className?: string;
};

export function StatCard({ label, value, icon: Icon, note, className = '' }: StatCardProps) {
  return (
    <div className={`stat-card ${className}`.trim()}>
      {Icon && <Icon size={20} strokeWidth={2.4} aria-hidden="true" />}
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {note && <small className="stat-note">{note}</small>}
    </div>
  );
}
