export type ThemeMode = 'dark' | 'light';

export interface ThemeTokens {
  bg: string;
  surface: string;
  surface2: string;
  surfaceHover: string;
  border: string;
  borderStrong: string;
  text: string;
  textDim: string;
  textFaint: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  shellcode: string;
  output: string;
  placeholder: string;
}

export const darkTheme: ThemeTokens = {
  bg: '#0a0a0a',
  surface: '#131313',
  surface2: '#1a1a1a',
  surfaceHover: '#1f1f1f',
  border: '#242424',
  borderStrong: '#383838',
  text: '#f1f1f1',
  textDim: '#8a8a8a',
  textFaint: '#535353',
  accent: '#d63d3d',
  accentHover: '#e85555',
  accentSoft: '#2a1414',
  success: '#4ade80',
  warning: '#fbbf24',
  danger: '#ef4444',
  info: '#60a5fa',
  shellcode: '#22c1c9',
  output: '#4ade80',
  placeholder: '#cc8844',
};

export const lightTheme: ThemeTokens = {
  bg: '#fafafa',
  surface: '#ffffff',
  surface2: '#f4f4f5',
  surfaceHover: '#ececee',
  border: '#e4e4e7',
  borderStrong: '#c4c4c8',
  text: '#18181b',
  textDim: '#71717a',
  textFaint: '#a1a1aa',
  accent: '#b91c1c',
  accentHover: '#991b1b',
  accentSoft: '#fef2f2',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#2563eb',
  shellcode: '#0891b2',
  output: '#16a34a',
  placeholder: '#c2410c',
};

export const themes: Record<ThemeMode, ThemeTokens> = {
  dark: darkTheme,
  light: lightTheme,
};

export function applyTheme(mode: ThemeMode): void {
  const t = themes[mode];
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  for (const [k, v] of Object.entries(t)) {
    root.style.setProperty(`--${camelToKebab(k)}`, v);
  }
}

function camelToKebab(s: string): string {
  return s.replace(/([A-Z])/g, '-$1').toLowerCase();
}
