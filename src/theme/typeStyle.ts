import type { CSSProperties } from 'react';
import { typeScale, type TypeVariant } from './tokens';

/**
 * The type scale as inline styles. Inline beats any class, so a variant always wins over
 * a component's own rules — the same precedence RN's style arrays gave us.
 */
export const typeStyles: Record<TypeVariant, CSSProperties> = Object.fromEntries(
  Object.entries(typeScale).map(([variant, t]) => [
    variant,
    {
      fontFamily: t.font.fontFamily,
      fontWeight: t.font.fontWeight,
      fontStyle: t.font.fontStyle,
      fontSize: t.fontSize,
      lineHeight: `${t.lineHeight}px`,
      ...('letterSpacing' in t && t.letterSpacing !== undefined ? { letterSpacing: t.letterSpacing } : null),
      ...('textTransform' in t && t.textTransform ? { textTransform: t.textTransform } : null),
    } satisfies CSSProperties,
  ]),
) as Record<TypeVariant, CSSProperties>;
