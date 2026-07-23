'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Flame,
  MoonStar,
  Sparkles,
} from 'lucide-react';
import {
  DEFAULT_IMMORTAL_THEME,
  IMMORTAL_THEMES,
  isImmortalTheme,
  THEME_LABELS,
  THEME_STORAGE_KEY,
  type ImmortalTheme,
} from '@/lib/theme/theme';

const icons = {
  azure: Sparkles,
  abyss: Flame,
  moonlight: MoonStar,
} satisfies Record<ImmortalTheme, typeof Sparkles>;

const descriptions: Record<ImmortalTheme, string> = {
  azure: 'Tinh hà lam ngọc, cyan rực sáng và linh khí chuyển động.',
  abyss: 'Hắc vực sâu thẳm, đỏ thẫm, góc cạnh và gần như không phát sáng.',
  moonlight: 'Ánh trăng bạc, tím sương, bề mặt mờ và thanh thoát.',
};

function applyTheme(theme: ImmortalTheme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = 'dark';
}

export default function ThemeSwitcher() {
  const [theme, setThemeState] =
    useState<ImmortalTheme>(DEFAULT_IMMORTAL_THEME);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const CurrentIcon = icons[theme];

  useEffect(() => {
    let cancelled = false;
    let initialTheme = DEFAULT_IMMORTAL_THEME;

    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      initialTheme = isImmortalTheme(stored)
        ? stored
        : DEFAULT_IMMORTAL_THEME;
    } catch {
      // localStorage có thể bị chặn; dùng theme mặc định.
    }

    applyTheme(initialTheme);

    // Cập nhật nhãn/icon sau khi component đã mount, tránh setState đồng bộ
    // trực tiếp trong effect theo rule React 19.
    queueMicrotask(() => {
      if (!cancelled) {
        setThemeState(initialTheme);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeEscape);

    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, []);

  function selectTheme(nextTheme: ImmortalTheme) {
    setThemeState(nextTheme);
    applyTheme(nextTheme);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Theme vẫn hoạt động trong phiên hiện tại.
    }

    setOpen(false);
  }

  return (
    <div className="p22-theme-switcher" ref={rootRef}>
      <button
        type="button"
        className="p22-theme-trigger"
        aria-label="Đổi giao diện"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <CurrentIcon size={16} />
        <span className="hidden 2xl:inline">{THEME_LABELS[theme]}</span>
        <ChevronDown
          size={13}
          className={open ? 'rotate-180 transition' : 'transition'}
        />
      </button>

      {open && (
        <div className="p22-theme-menu" role="menu">
          <div className="p22-theme-menu__heading">
            <span>Immortal Theme Engine</span>
            <small>Chọn phong cách hiển thị</small>
          </div>

          {IMMORTAL_THEMES.map((item) => {
            const Icon = icons[item];
            const active = theme === item;

            return (
              <button
                key={item}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`p22-theme-option p22-theme-option--${item}`}
                onClick={() => selectTheme(item)}
              >
                <span className="p22-theme-option__preview">
                  <Icon size={18} />
                </span>

                <span className="p22-theme-option__copy">
                  <strong>{THEME_LABELS[item]}</strong>
                  <small>{descriptions[item]}</small>
                </span>

                {active && <Check size={16} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
