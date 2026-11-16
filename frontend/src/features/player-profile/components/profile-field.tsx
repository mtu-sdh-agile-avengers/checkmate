import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function ProfileField({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="profile-field">
      <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
      <div><span className="field-label">{label}</span><strong>{children}</strong></div>
    </div>
  );
}
