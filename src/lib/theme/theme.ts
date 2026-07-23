export const IMMORTAL_THEMES = ['azure', 'abyss', 'moonlight'] as const;

export type ImmortalTheme = (typeof IMMORTAL_THEMES)[number];

export const DEFAULT_IMMORTAL_THEME: ImmortalTheme = 'azure';
export const THEME_STORAGE_KEY = 'mod-thu-vien-theme';

export const THEME_LABELS: Record<ImmortalTheme, string> = {
  azure: 'Immortal Azure',
  abyss: 'Abyss Black',
  moonlight: 'Moonlight',
};

export function isImmortalTheme(value: unknown): value is ImmortalTheme {
  return (
    typeof value === 'string' &&
    (IMMORTAL_THEMES as readonly string[]).includes(value)
  );
}
