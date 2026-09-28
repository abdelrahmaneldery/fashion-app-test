import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconButton } from '@/components/IconButton';
import { LockSimpleIcon, PlusIcon } from '@/components/icons';
import { Image } from '@/components/Image';
import { TAB_BAR_HEIGHT } from '@/components/TabBar';
import { Text } from '@/components/Text';
import { formatPrice, lookImage, looks, productImage, products } from '@/data/catalog';
import { useElementSize } from '@/hooks/useElementSize';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useBreakpoint } from '@/hooks/useViewport';
import { parseKey, useSeamStore, type Lookbook } from '@/store/useSeamStore';
import { useTheme, useThemeColorMeta } from '@/theme/theme';
import { cardPhoto, layout, space } from '@/theme/tokens';
import styles from './Lookbooks.module.css';

const thumb = (key: string) => {
  const ref = parseKey(key);
  return ref.kind === 'look' ? lookImage(ref.id) : productImage(ref.id);
};

const columnsFor = (breakpoint: 'phone' | 'tablet' | 'wide') =>
  breakpoint === 'wide' ? 6 : breakpoint === 'tablet' ? 4 : 3;

/** A board cover: one large frame with two stacked beside it, the way a Lookbook reads at a glance. */
function BoardCover({ items }: { items: string[] }) {
  const [lead, ...rest] = items;
  return (
    <div className={styles.cover}>
      {lead ? <img src={thumb(lead)} alt="" className={styles.coverLead} /> : null}
      <div className={styles.coverSide}>
        {[0, 1].map((i) => (
          <span key={i} className={styles.coverCell}>
            {rest[i] ? <img src={thumb(rest[i])} alt="" className={styles.coverImg} /> : null}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Lookbooks() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [gridRef, gridSize] = useElementSize<HTMLDivElement>();
  const count = columnsFor(useBreakpoint());
  const [tab, setTab] = useState<'boards' | 'saves'>('boards');
  useThemeColorMeta();

  const saves = useSeamStore((s) => s.saves);
  const lookbooks = useSeamStore((s) => s.lookbooks);
  const createLookbook = useSeamStore((s) => s.createLookbook);
  const showToast = useSeamStore((s) => s.showToast);

  const saved = useMemo(
    () =>
      Object.entries(saves)
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k),
    [saves],
  );
  const cell = (gridSize.width - layout.margin * 2 - layout.gutter * (count - 1)) / count;
  const boardWidth = (gridSize.width - layout.margin * 2 - layout.gutter) / 2;
  const toastBottom = insets.bottom + TAB_BAR_HEIGHT + space.s8;

  const addBoard = () => {
    const name = `Lookbook ${lookbooks.length + 1}`;
    createLookbook(name, true);
    showToast({ message: `Created ${name}`, bottom: toastBottom });
  };

  return (
    <div ref={gridRef} className={`scroll ${styles.screen}`}>
      <div style={{ paddingTop: insets.top + space.s16, paddingBottom: insets.bottom + TAB_BAR_HEIGHT + space.s32 }}>
        <div className={styles.head}>
          <Text variant="displayL" as="h1">
            Lookbooks
          </Text>
          <IconButton icon={PlusIcon} disc aria-label="New Lookbook" onClick={addBoard} />
        </div>

        <div className={styles.tabs} role="tablist">
          {(['boards', 'saves'] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={tab === key ? `${styles.tab} ${styles.tabOn}` : styles.tab}
              onClick={() => setTab(key)}
            >
              <Text variant="action" color={tab === key ? 'actionInverse' : 'textSecondary'}>
                {key === 'boards' ? `Boards · ${lookbooks.length}` : `All saves · ${saved.length}`}
              </Text>
            </button>
          ))}
        </div>

        {tab === 'boards' ? (
          <div className={styles.boards}>
            {lookbooks.map((lb: Lookbook) => (
              <div key={lb.id} className={styles.board} style={{ width: boardWidth }}>
                <BoardCover items={lb.items} />
                <div className={styles.boardName}>
                  <Text variant="bodyMedium" lines={1}>
                    {lb.name}
                  </Text>
                  {lb.isPrivate ? <LockSimpleIcon size={13} weight="bold" color={colors.textMuted} /> : null}
                </div>
                <Text variant="caption" color="textMuted" as="div">
                  {`${lb.items.length} item${lb.items.length === 1 ? '' : 's'}`}
                </Text>
              </div>
            ))}
            <button type="button" className={styles.newBoard} style={{ width: boardWidth }} onClick={addBoard}>
              <span className={styles.newIcon}>
                <PlusIcon size={20} weight="bold" color={colors.iconPrimary} />
              </span>
              <Text variant="action">New Lookbook</Text>
            </button>
          </div>
        ) : saved.length ? (
          <div className={styles.grid}>
            {saved.map((key) => {
              const ref = parseKey(key);
              const label =
                ref.kind === 'look'
                  ? looks[ref.id]?.style
                  : products[ref.id]
                    ? `${products[ref.id].brand} · ${formatPrice(products[ref.id].price)}`
                    : '';
              return (
                <Link
                  key={key}
                  to={ref.kind === 'look' ? `/look/${ref.id}` : `/product/${ref.id}`}
                  aria-label={label}
                  className={styles.cell}
                  style={{ width: cell }}
                >
                  <div className={styles.cellPhoto} style={{ width: cell, height: cell * cardPhoto.tile }}>
                    <Image src={thumb(key)} />
                  </div>
                  <Text variant="micro" color="textMuted" lines={1} as="div" style={{ marginTop: space.s4 }}>
                    {label}
                  </Text>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className={styles.empty}>
            <Text variant="h2" as="h2">
              Nothing saved yet
            </Text>
            <Text variant="body" color="textSecondary">
              Tap Save on any Look or piece and it lands here.
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}
