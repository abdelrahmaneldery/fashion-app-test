import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { themes, type ThemeName } from './tokens';

const ThemeContext = createContext<ThemeName>('light');

/**
 * Sets the colour mode for everything inside it, like a Figma variable mode on a frame.
 * `display: contents` keeps the wrapper out of layout while custom properties still inherit
 * down to every CSS Module rule in the subtree.
 */
export function ThemeScope({ name, children }: { name: ThemeName; children: ReactNode }) {
  return (
    <ThemeContext.Provider value={name}>
      <div data-theme={name} style={{ display: 'contents' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const name = useContext(ThemeContext);
  return { name, colors: themes[name], isDark: name === 'dark' };
}

/**
 * Tints the mobile browser chrome to match this screen, the web counterpart of the status bar
 * style each screen used to set. Restores the app-wide colour when the screen unmounts.
 */
export function useThemeColorMeta(color?: string) {
  const { colors } = useTheme();
  const value = color ?? colors.bgPrimary;
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) return;
    const previous = meta.content;
    meta.content = value;
    return () => {
      meta.content = previous;
    };
  }, [value]);
}

/** Components that sit on photographs are pinned to Dark, whatever the surrounding theme. */
export const onPhoto = themes.dark;
