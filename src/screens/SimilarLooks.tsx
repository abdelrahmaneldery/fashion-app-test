import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ActionMenu } from '@/components/ActionMenu';
import { BottomSheet, sheetDetent } from '@/components/BottomSheet';
import { IconButton } from '@/components/IconButton';
import { DotsThreeIcon, XIcon } from '@/components/icons';
import { Image } from '@/components/Image';
import { Text } from '@/components/Text';
import { creators, lookImage, looks, similarLooks } from '@/data/catalog';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useViewport } from '@/hooks/useViewport';
import { share } from '@/lib/platform';
import { useSeamStore } from '@/store/useSeamStore';
import { useThemeColorMeta } from '@/theme/theme';
import { space } from '@/theme/tokens';
import { NotFound } from './NotFound';
import styles from './SimilarLooks.module.css';

/**
 * Search inside one photograph: the Look stays under the whole screen while the Looks that
 * resemble it rise over its foot, as close or as far as the sheet is dragged.
 */
export function SimilarLooks() {
  const { id } = useParams<{ id: string }>();
  const look = id ? looks[id] : undefined;
  if (!look) return <NotFound />;
  return <Results key={look.id} lookId={look.id} />;
}

function Results({ lookId }: { lookId: string }) {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const { height } = useViewport();
  const showToast = useSeamStore((s) => s.showToast);
  const [detent, setDetent] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  useThemeColorMeta('#0B0B0C');

  const look = looks[lookId];
  const creator = creators[look.creatorId];
  const similar = similarLooks(look);

  // Resting over the foot of the photo, or pulled up to leave a glimpse of it.
  const heights = [sheetDetent(height, 0.56) + insets.bottom, height - (insets.top + space.s64)];
  const toastBottom = insets.bottom + space.s16;

  const onShare = async () => {
    const message = await share(`${creator.name}'s ${look.style.toLowerCase()} Look on SEAM`);
    if (message) showToast({ message, bottom: toastBottom });
  };

  return (
    <div className={styles.screen}>
      {/* The screen says what it is to the eye; this says it to a screen reader. */}
      <Text variant="label" as="h1" className="srOnly">
        Similar Looks
      </Text>
      <div className={styles.stage}>
        <Image src={lookImage(look.id)} eager alt={`${look.style} Look by ${creator.name}`} />
      </div>

      <div className={styles.controls} style={{ top: insets.top + space.s8 }}>
        <IconButton icon={XIcon} variant="floating" aria-label="Close" onClick={() => navigate(-1)} />
        <IconButton
          icon={DotsThreeIcon}
          variant="floating"
          weight="bold"
          aria-label="More options"
          onClick={() => setMenuOpen(true)}
        />
      </div>

      <BottomSheet
        open
        heights={heights}
        index={detent}
        onIndexChange={setDetent}
        // Dragging the sheet off the bottom means "show me the photo again", which is the Look.
        onRequestClose={() => navigate(-1)}
        scrim={[0, 0]}
        handle={
          <div className={styles.head}>
            <Text variant="label" color="textMuted">
              More like this
            </Text>
            <Text variant="label" color="textMuted" tabular>
              {similar.length}
            </Text>
          </div>
        }
        aria-label={`Looks similar to ${creator.name}'s ${look.style.toLowerCase()} Look`}
      >
        <div className="scroll" style={{ height: '100%' }}>
          <div className={styles.grid} style={{ paddingBottom: insets.bottom + space.s32 }}>
            {similar.map((l) => (
              <Link
                key={l.id}
                to={`/look/${l.id}`}
                className={styles.cell}
                aria-label={`${l.style} Look by ${creators[l.creatorId].name}, ${l.pieces.length} pieces`}
              >
                <Image src={lookImage(l.id)} transition={0} />
              </Link>
            ))}
          </div>
        </div>
      </BottomSheet>

      <ActionMenu
        open={menuOpen}
        title="Look options"
        onClose={() => setMenuOpen(false)}
        options={[
          { label: 'Share this Look', onSelect: onShare },
          {
            label: 'See fewer like this',
            onSelect: () => showToast({ message: "We'll show fewer Looks like this", bottom: toastBottom }),
          },
        ]}
      />
    </div>
  );
}
