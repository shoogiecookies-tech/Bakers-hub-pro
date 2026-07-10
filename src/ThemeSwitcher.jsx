import { useEffect, useState } from 'react';
import { Moon, Cookie, Sun } from 'lucide-react';

const STORAGE_KEY = 'bakeflo_theme';

const THEMES = [
  { id: 'dark', label: 'Dark', Icon: Moon },
  { id: 'cozy', label: 'Cozy', Icon: Cookie },
  { id: 'light', label: 'Light', Icon: Sun },
];

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEY) || 'cozy');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <div className="flex items-center gap-0.5 rounded-full bg-card border border-border p-1">
      {THEMES.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setTheme(id)}
          aria-label={`${label} theme`}
          aria-pressed={theme === id}
          className={
            'flex items-center justify-center w-7 h-7 rounded-full transition-colors ' +
            (theme === id ? 'bg-accent text-white' : 'text-foreground/50 hover:text-foreground')
          }
        >
          <Icon size={14} strokeWidth={2.25} />
        </button>
      ))}
    </div>
  );
}
