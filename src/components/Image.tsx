import { useState, type CSSProperties } from 'react';

type Props = {
  src: string;
  alt?: string;
  /** How the image fills its box. */
  fit?: 'cover' | 'contain';
  /** Fade-in once decoded, in ms. 0 shows it immediately. */
  transition?: number;
  /** Heroes and anything above the fold should not be lazy. */
  eager?: boolean;
  className?: string;
  style?: CSSProperties;
  onLoad?: () => void;
};

/**
 * One image element for the whole app: fills its box, fades in when decoded, and stays out of the
 * accessibility tree unless it is given a label (most images here sit inside a labelled control).
 */
export function Image({ src, alt = '', fit = 'cover', transition = 200, eager, className, style, onLoad }: Props) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onLoad={() => {
        setLoaded(true);
        onLoad?.();
      }}
      style={{
        width: '100%',
        height: '100%',
        objectFit: fit,
        opacity: transition ? (loaded ? 1 : 0) : 1,
        transition: transition ? `opacity ${transition}ms ease-out` : undefined,
        ...style,
      }}
    />
  );
}
