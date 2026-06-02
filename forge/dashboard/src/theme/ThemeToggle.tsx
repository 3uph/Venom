import { useTheme } from './ThemeProvider';
import { t, radius, font, space } from './tokens';

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export default function ThemeToggle() {
  const { mode, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={mode === 'dark' ? 'Switch to light' : 'Switch to dark'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: space.sm,
        padding: `${space.sm} ${space.md}`,
        background: 'transparent',
        border: `1px solid ${t.border}`,
        borderRadius: radius.md,
        color: t.textDim,
        cursor: 'pointer',
        fontSize: font.sm,
        transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = t.surfaceHover;
        e.currentTarget.style.color = t.text;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = t.textDim;
      }}
    >
      {mode === 'dark' ? <SunIcon /> : <MoonIcon />}
      <span>{mode === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}
