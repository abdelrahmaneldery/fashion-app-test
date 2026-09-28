import { palette } from '@/theme/tokens';
import styles from './SimilarButton.module.css';

/** A lens with a spark in it: search inside this photograph rather than across the app. */
function LensGlyph({ size = 22, color = palette.ink }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <circle cx="10.2" cy="11" r="6.2" stroke={color} strokeWidth="2" />
      <path d="M14.8 15.6 L20 20.8" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M18.6 2.6 L19.5 5 L21.9 5.9 L19.5 6.8 L18.6 9.2 L17.7 6.8 L15.3 5.9 L17.7 5 Z" fill={color} />
    </svg>
  );
}

/** Sits in the corner of a photograph and opens the Looks that resemble it. */
export function SimilarButton({ onClick, 'aria-label': ariaLabel }: { onClick: () => void; 'aria-label': string }) {
  return (
    <button type="button" className={styles.button} aria-label={ariaLabel} onClick={onClick}>
      <LensGlyph />
    </button>
  );
}
