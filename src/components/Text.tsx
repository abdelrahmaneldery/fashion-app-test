import type { ComponentPropsWithoutRef, CSSProperties } from 'react';
import type { ColorToken, TypeVariant } from '@/theme/tokens';
import { typeStyles } from '@/theme/typeStyle';

type Element = 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'label' | 'strong';

type Props = Omit<ComponentPropsWithoutRef<'span'>, 'color'> & {
  variant?: TypeVariant;
  color?: ColorToken;
  /** Tabular figures, for prices and counts that line up in lists. */
  tabular?: boolean;
  /** Clamp to this many lines with an ellipsis. */
  lines?: number;
  /** Headings and paragraphs carry their own element, so the page outlines correctly. */
  as?: Element;
};

const clamp = (lines: number): CSSProperties =>
  lines === 1
    ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
    : { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: lines, overflow: 'hidden' };

/** Every piece of text in the app. The variant is inline, so it always wins over a component's rules. */
export function Text({ variant = 'body', color = 'textPrimary', tabular, lines, as: Tag = 'span', style, ...rest }: Props) {
  return (
    <Tag
      style={{
        margin: 0,
        color: `var(--c-${color})`,
        ...typeStyles[variant],
        ...(tabular ? { fontVariantNumeric: 'tabular-nums' } : null),
        ...(lines ? clamp(lines) : null),
        ...style,
      }}
      {...rest}
    />
  );
}
