import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

export default function IV2AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="iv2-auth-shell">
      <div className="iv2-form-card iv2-auth-card">
        <div className="relative z-10">
          <div className="mb-5 flex items-center gap-3">
            <span className="iv2-icon h-11 w-11 shrink-0">
              <Sparkles size={18} />
            </span>
            <div>
              <h1 className="iv2-auth-title">{title}</h1>
              {subtitle && <p className="iv2-auth-subtitle">{subtitle}</p>}
            </div>
          </div>

          <div className="iv2-form-section">{children}</div>

          {footer && (
            <div className="mt-6 border-t border-[#36d7ff]/10 pt-5 text-sm text-[#839caf]">
              {footer}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
