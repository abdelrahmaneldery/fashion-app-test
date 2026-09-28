import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '@/components/IconButton';
import { CameraIcon, ImagesIcon, SparkleIcon, XIcon } from '@/components/icons';
import { ProductCard } from '@/components/ProductCard';
import { Text } from '@/components/Text';
import { alternativesFor, products } from '@/data/catalog';
import { useElementSize } from '@/hooks/useElementSize';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useThemeColorMeta } from '@/theme/theme';
import { layout, space, themes } from '@/theme/tokens';
import styles from './VisualSearch.module.css';

/**
 * Search by photograph. The matcher is not built yet, so picking an image returns the catalogue's
 * closest-by-category set — enough to prove the flow and the layout it needs.
 */
export function VisualSearch() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [gridRef, gridSize] = useElementSize<HTMLDivElement>();
  const [photo, setPhoto] = useState<string | null>(null);
  useThemeColorMeta(themes.dark.bgPrimary);

  const seed = products['halden-linen-blazer'];
  const matches = photo ? [seed, ...alternativesFor(seed)] : [];
  const width = (gridSize.width - layout.margin * 2 - layout.gutter) / 2;

  const pick = (file: File | undefined) => {
    if (!file) return;
    setPhoto(URL.createObjectURL(file));
  };

  return (
    <div className={styles.screen}>
      {/* The screen says what it is to the eye; this says it to a screen reader. */}
      <Text variant="label" as="h1" className="srOnly">
        Search with a photo
      </Text>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className={styles.file}
        aria-label="Choose a photo to search with"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {/* Viewfinder */}
      <div className={styles.stage}>
        {photo ? (
          <img src={photo} alt="The photo you are searching with" className={styles.shot} />
        ) : (
          <div className={styles.empty}>
            <CameraIcon size={40} weight="light" color="rgba(242,239,234,0.55)" />
            <Text variant="bodyL" as="div" style={{ color: '#F2EFEA' }}>
              Point at a garment
            </Text>
            <Text variant="caption" as="div" style={{ color: 'rgba(242,239,234,0.62)', maxWidth: 260 }}>
              SEAM reads the shape, fabric and colour, then finds the closest pieces it stocks.
            </Text>
          </div>
        )}
        <span className={styles.frame} aria-hidden="true" />

        <div className={styles.top} style={{ top: insets.top + space.s8 }}>
          <IconButton icon={XIcon} variant="floating" aria-label="Close" onClick={() => navigate(-1)} />
        </div>
      </div>

      {/* Controls, or results once a photo exists */}
      {photo ? (
        <div ref={gridRef} className={`scroll ${styles.results}`}>
          <div style={{ paddingBottom: insets.bottom + space.s32 }}>
            <div className={styles.resultsHead}>
              <SparkleIcon size={18} weight="fill" color="var(--c-accent)" />
              <Text variant="h3" as="h2">
                {matches.length} close matches
              </Text>
            </div>
            <div className={styles.grid}>
              {matches.map((p) => (
                <ProductCard key={p.id} product={p} width={width} toastBottom={insets.bottom + space.s16} />
              ))}
            </div>
            <button type="button" className={styles.again} onClick={() => setPhoto(null)}>
              <Text variant="action">Search another photo</Text>
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.controls} style={{ paddingBottom: insets.bottom + space.s24 }}>
          <button type="button" className={styles.library} onClick={() => fileRef.current?.click()}>
            <ImagesIcon size={24} weight="regular" color="#F2EFEA" />
            <Text variant="micro" as="div" style={{ color: '#F2EFEA' }}>
              Library
            </Text>
          </button>
          <button
            type="button"
            className={styles.shutter}
            aria-label="Take a photo to search with"
            onClick={() => fileRef.current?.click()}
          />
          <span className={styles.library} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
