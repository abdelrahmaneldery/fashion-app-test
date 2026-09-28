import { APP_MAX_WIDTH, elevation, layout, radius, space, themes, type ThemeName } from './tokens';

const vars = (name: ThemeName) =>
  [
    ...Object.entries(themes[name]).map(([token, value]) => `  --c-${token}: ${value};`),
    ...Object.entries(elevation[name]).map(([token, value]) => `  --shadow-${token}: ${value};`),
  ].join('\n');

/**
 * Every design token as a custom property, so CSS Modules can read them and a ThemeScope
 * can re-declare the colour set for its subtree. tokens.ts stays the single source of truth.
 */
export const themeVarsCss = [
  `:root {
${Object.entries(space)
  .map(([k, v]) => `  --space-${k.slice(1)}: ${v}px;`)
  .join('\n')}
${Object.entries(radius)
  .map(([k, v]) => `  --radius-${k}: ${v}px;`)
  .join('\n')}
${Object.entries(layout)
  .map(([k, v]) => `  --layout-${k}: ${v}px;`)
  .join('\n')}
  --app-max-width: ${APP_MAX_WIDTH}px;
  /* Light is the fallback the page paints before React mounts and states a mode. */
${vars('light')}
}`,
  // Until React writes data-theme on <html>, a dark device gets dark surfaces from the first
  // frame. The guard means an explicit mode still wins, including Light on a dark phone.
  `@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
${vars('dark')}
  }
}`,
  `[data-theme='dark'] {\n${vars('dark')}\n}`,
  `[data-theme='light'] {\n${vars('light')}\n}`,
  `[data-theme='bone'] {\n${vars('bone')}\n}`,
].join('\n\n');

/** Injected as the first stylesheet in <head>, so component styles always win over it. */
export function installThemeVars() {
  const style = document.createElement('style');
  style.id = 'seam-theme-vars';
  style.textContent = themeVarsCss;
  document.head.prepend(style);
}
