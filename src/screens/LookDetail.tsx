import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ActionMenu } from '@/components/ActionMenu';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { CommentsSheet, handleOf } from '@/components/CommentsSheet';
import { Eyelet, placeTags, type EyeletState, type TagPlacement } from '@/components/Eyelet';
import { IconButton } from '@/components/IconButton';
import { CaretLeftIcon, ChatCircleIcon, DotsThreeIcon, ExportIcon, HeartIcon } from '@/components/icons';
import { Image } from '@/components/Image';
import { LookCard } from '@/components/LookCard';
import { Masonry } from '@/components/Masonry';
import { PieceRow } from '@/components/PieceRow';
import { PieceSheet, pieceSheetMedium } from '@/components/PieceSheet';
import { PiecesPill } from '@/components/PiecesPill';
import { PiecesSheet } from '@/components/PiecesSheet';
import { SaveButton } from '@/components/SaveButton';
import { SimilarButton } from '@/components/SimilarButton';
import { Tag } from '@/components/Tag';
import { Text } from '@/components/Text';
import {
  creators,
  formatPrice,
  identifiedProducts,
  lookImage,
  productImage,
  looks,
  lookTotal,
  moreFromCreator,
  products,
  similarLooks,
  type Look,
} from '@/data/catalog';
import { useElementSize } from '@/hooks/useElementSize';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useViewport } from '@/hooks/useViewport';
import { track } from '@/lib/analytics';
import { haptics, share } from '@/lib/platform';
import { baselineLikes, formatCount, ME } from '@/lib/social';
import { useSeamStore } from '@/store/useSeamStore';
import { useTheme, useThemeColorMeta } from '@/theme/theme';
import { layout, space } from '@/theme/tokens';
import styles from './LookDetail.module.css';

export function LookDetail() {
  const { id } = useParams<{ id: string }>();
  const look = id ? looks[id] : undefined;
  if (!look) return <Missing />;
  return <Detail key={look.id} look={look} />;
}

function Missing() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: space.s16,
        height: '100%',
        padding: `${insets.top + space.s48}px ${layout.margin}px`,
        background: 'var(--c-bgPrimary)',
      }}
    >
      <Text variant="h1" as="h1">
        This Look was removed
      </Text>
      <Text variant="body" color="textSecondary" style={{ maxWidth: 560 }}>
        The creator took it down. Pieces you saved from it are still in All Saves.
      </Text>
      <Button label="Back to Home" variant="secondary" onClick={() => navigate('/')} style={{ alignSelf: 'flex-start' }} />
    </div>
  );
}

function Detail({ look }: { look: Look }) {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const { height: H } = useViewport();
  const [scrollRef, { width: W }] = useElementSize<HTMLDivElement>();
  useThemeColorMeta();

  const creator = creators[look.creatorId];
  const following = useSeamStore((s) => s.following.includes(look.creatorId));
  const toggleFollow = useSeamStore((s) => s.toggleFollow);
  const hasSeenBreath = useSeamStore((s) => s.hasSeenBreath);
  const markBreathSeen = useSeamStore((s) => s.markBreathSeen);
  const showToast = useSeamStore((s) => s.showToast);

  // Hero: full width at the photo's ratio, capped at 75% of the screen (then cropped from the centre).
  const imgH = W / look.ratio;
  const heroH = Math.min(imgH, H * 0.86);
  const cropY = (imgH - heroH) / 2;
  const hotspot = (i: number) => ({ x: look.pieces[i].x * W, y: look.pieces[i].y * imgH - cropY });

  const [pinsOn, setPinsOn] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [piecesOpen, setPiecesOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [detent, setDetent] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const [breath] = useState(!hasSeenBreath);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [pastSimilar, setPastSimilar] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [focusComposer, setFocusComposer] = useState(false);
  const [burst, setBurst] = useState<{ id: number; x: number; y: number } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const reduceMotion = useReducedMotion();
  const { colors } = useTheme();

  const liked = useSeamStore((s) => !!s.likedLooks[look.id]);
  const toggleLookLike = useSeamStore((s) => s.toggleLookLike);
  const likeLook = useSeamStore((s) => s.likeLook);
  const allComments = useSeamStore((s) => s.comments);
  const comments = useMemo(
    () => allComments.filter((c) => c.lookId === look.id).sort((a, b) => b.at - a.at),
    [allComments, look.id],
  );
  const likeCount = baselineLikes(look.id) + (liked ? 1 : 0);

  const similarRef = useRef<HTMLDivElement>(null);
  const scrollY = useRef(0);
  const similarY = useRef(Number.MAX_SAFE_INTEGER);
  const restoreY = useRef(0);

  // The bar is as tall as the controls in it, which are one touch target each.
  const topBarBottom = insets.top + layout.hit;
  const actionBarH = 64 + insets.bottom;
  const mediumH = pieceSheetMedium(H) + insets.bottom;
  const toastBottom = actionBarH + space.s8;

  // Compact bar after half the hero has scrolled away; the action bar steps aside at Similar Looks.
  // Both also yield to the open piece sheet, so they are derived rather than stored.
  const compactVisible = pastHero && !sheetOpen;
  const barHidden = pastSimilar || sheetOpen || commentsOpen;
  const overPhoto = sheetOpen || piecesOpen;

  const smoothScrollTo = (y: number) => scrollRef.current?.scrollTo({ top: y, behavior: 'smooth' });

  /** Centre the hotspot in the part of the photo the sheet leaves visible. */
  const focusHotspot = (i: number) => {
    const visibleMid = (topBarBottom + (H - mediumH)) / 2;
    smoothScrollTo(Math.max(0, hotspot(i).y - visibleMid));
  };

  const closeSheet = () => {
    setSheetOpen(false);
    smoothScrollTo(restoreY.current);
  };

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop;
    scrollY.current = y;
    setPastHero(y > heroH * 0.5);
    setPastSimilar(y + topBarBottom >= similarY.current);
  };

  // The Similar Looks heading is the line where the action bar gives way.
  useEffect(() => {
    const measure = () => {
      const el = similarRef.current;
      const container = scrollRef.current;
      if (!el || !container) return;
      similarY.current =
        el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop + space.s48;
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (scrollRef.current) observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, [scrollRef, look.id]);

  useEffect(() => track({ name: 'look_viewed', lookId: look.id }), [look.id]);

  const openPiece = (i: number, from: 'hotspot' | 'row' | 'list' = 'hotspot') => {
    track({ name: 'piece_opened', lookId: look.id, position: i + 1, identified: !!look.pieces[i].productId, from });
    if (!sheetOpen) restoreY.current = scrollY.current;
    setPinsOn(true);
    setSelected(i);
    setDetent(0);
    setSheetOpen(true);
    focusHotspot(i);
  };

  /** From the list of every piece into that piece; the list steps aside as the sheet arrives. */
  const openFromList = (i: number) => {
    setPiecesOpen(false);
    openPiece(i, 'list');
  };

  /** And back again, without disturbing where the photo was left. */
  const showAllPieces = () => {
    setSheetOpen(false);
    setPiecesOpen(true);
  };

  const selectPiece = (i: number) => {
    setSelected(i);
    if (!look.pieces[i].productId) setDetent(0);
    if (detent === 0) focusHotspot(i);
  };

  const openComments = (focus: boolean) => {
    setFocusComposer(focus);
    setCommentsOpen(true);
  };

  /**
   * Two taps on the photograph like the Look, the way a feed has taught everyone to. Taps on an
   * Eyelet or a control are theirs, and a second double-tap never takes the like back.
   */
  const onHeroPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as Element).closest('button, a')) return;
    const prev = lastTap.current;
    if (prev && e.timeStamp - prev.t < 320 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 32) {
      lastTap.current = null;
      if (!liked) track({ name: 'look_liked', lookId: look.id, liked: true, from: 'double_tap' });
      likeLook(look.id);
      haptics.selection();
      if (!reduceMotion) {
        const box = e.currentTarget.getBoundingClientRect();
        setBurst({ id: e.timeStamp, x: e.clientX - box.left, y: e.clientY - box.top });
      }
      return;
    }
    lastTap.current = { t: e.timeStamp, x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    if (!burst) return;
    const t = window.setTimeout(() => setBurst(null), 700);
    return () => window.clearTimeout(t);
  }, [burst]);

  const tagText = useMemo(
    () =>
      look.pieces.map((p) => {
        const product = p.productId ? products[p.productId] : undefined;
        return { name: product ? product.name : p.label, brand: product?.brand };
      }),
    [look],
  );

  // Every tag shows at once, so each takes the place by its Eyelet where it covers nothing else. A piece
  // cropped out of the photo has no Eyelet to hang a tag from; the Pieces pill still lists it.
  const tagPlacements = useMemo(() => {
    const spots = look.pieces.map((p, i) => ({ x: p.x * W, y: p.y * imgH - cropY, ...tagText[i] }));
    const shown = spots.flatMap((spot, i) => (spot.y >= 0 && spot.y <= heroH ? [i] : []));
    // The Pieces pill at the photo's foot on the left, and the lens (with the AI tag) on the right.
    const controls = [
      { l: 16, r: 124, t: heroH - 52, b: heroH - 8 },
      { l: W - 16 - (look.ai ? 104 : 52), r: W - 16, t: heroH - 64, b: heroH - 12 },
    ];
    const placed = placeTags(
      shown.map((i) => spots[i]),
      { top: topBarBottom, bottom: heroH, width: W },
      controls,
    );
    const byPiece: (TagPlacement | null)[] = spots.map(() => null);
    shown.forEach((piece, k) => {
      byPiece[piece] = placed[k];
    });
    return byPiece;
  }, [look, tagText, W, imgH, cropY, heroH, topBarBottom]);

  const eyeletState = (i: number): EyeletState => {
    if (!pinsOn) return 'hidden';
    if (sheetOpen) return i === selected ? 'selected' : 'dimmed';
    return 'default';
  };

  const onShare = async () => {
    const message = await share(`${creator.name}'s ${look.style.toLowerCase()} Look on SEAM`);
    if (message) showToast({ message, bottom: toastBottom });
  };

  const shopping = identifiedProducts(look);
  const identified = shopping.length;
  const prices = shopping.map((p) => p.price).sort((a, b) => a - b);
  const more = moreFromCreator(look);
  const similar = similarLooks(look).slice(0, 8);

  return (
    <div className={styles.screen}>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className={`scroll ${styles.feed} ${sheetOpen ? styles.locked : ''}`}
      >
        <div style={{ paddingBottom: actionBarH + space.s32 }}>
          {/* The photograph is the title to the eye; this is the title to a screen reader. */}
          <Text variant="label" as="h1" className="srOnly">
            {`${look.style} Look by ${creator.name}`}
          </Text>

          {/* Hero */}
          <div className={styles.hero} style={{ width: W, height: heroH }} onPointerUp={onHeroPointerUp}>
            <Image
              src={lookImage(look.id)}
              eager
              alt={`${look.style} Look by ${creator.name}. ${look.pieces.length} pieces.`}
              onLoad={() => {
                setImageReady(true);
                if (breath) markBreathSeen();
              }}
            />
            {look.pieces.map((p, i) => {
              const pos = hotspot(i);
              const product = p.productId ? products[p.productId] : undefined;
              const { name, brand } = tagText[i];
              const tag = tagPlacements[i];
              return (
                <Eyelet
                  key={p.index}
                  x={pos.x}
                  y={pos.y}
                  state={eyeletState(i)}
                  identified={!!product}
                  name={name}
                  brand={brand}
                  position={tag?.side}
                  tagShift={tag?.shift}
                  labelled={!!tag}
                  appearDelay={imageReady ? 200 + i * 40 : null}
                  breath={breath}
                  onOpen={() => (sheetOpen && selected === i ? closeSheet() : sheetOpen ? selectPiece(i) : openPiece(i))}
                  aria-label={
                    product
                      ? `Piece ${p.index} of ${look.pieces.length}, ${product.brand} ${product.name}, ${formatPrice(product.price)}`
                      : `Piece ${p.index} of ${look.pieces.length}, ${p.label.toLowerCase()}, not identified`
                  }
                />
              );
            })}
            <AnimatePresence>
              {burst ? (
                <motion.span
                  key={burst.id}
                  className={styles.burst}
                  style={{ left: burst.x, top: burst.y, x: '-50%', y: '-50%' }}
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: [0.3, 1.15, 1], opacity: 1 }}
                  exit={{ scale: 1.25, opacity: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  aria-hidden="true"
                >
                  <HeartIcon size={92} weight="fill" color="#FFFFFF" />
                </motion.span>
              ) : null}
            </AnimatePresence>
            <div className={styles.pill} style={{ opacity: overPhoto ? 0 : 1, pointerEvents: overPhoto ? 'none' : 'auto' }}>
              <PiecesPill count={look.pieces.length} open={piecesOpen} onOpen={() => setPiecesOpen(true)} />
            </div>
            <div
              className={styles.heroRight}
              style={{ opacity: overPhoto ? 0 : 1, pointerEvents: overPhoto ? 'none' : 'auto' }}
            >
              {look.ai ? <Tag text="AI" /> : null}
              <SimilarButton aria-label="Find Looks like this one" onClick={() => navigate(`/look/${look.id}/similar`)} />
            </div>
          </div>

          {/* Creator */}
          <div className={styles.creator}>
            <div className={styles.creatorRow}>
              <Link to={`/creator/${creator.id}`} className={styles.creatorLink} aria-label={`Open ${creator.name}`}>
                <Avatar creatorId={creator.id} size={40} />
                <span className={styles.creatorText}>
                  <Text variant="bodyMedium" as="div">
                    {creator.name}
                  </Text>
                  <Text variant="caption" color="textMuted" as="div">
                    {creator.handle}
                  </Text>
                </span>
              </Link>
              <Button
                label={following ? 'Following' : 'Follow'}
                variant="tertiary"
                muted={following}
                onClick={() => {
                  track({ name: 'follow_toggled', creatorId: creator.id, following: !following });
                  toggleFollow(creator.id);
                }}
              />
            </div>
            {/* The Look's reception: a heart and a thread, the way a feed has always done it. */}
            <div className={styles.social}>
              <button
                type="button"
                className={styles.socialButton}
                aria-pressed={liked}
                aria-label={`${liked ? 'Unlike' : 'Like'} this Look, ${formatCount(likeCount)} likes`}
                onClick={() => {
                  track({ name: 'look_liked', lookId: look.id, liked: !liked, from: 'button' });
                  toggleLookLike(look.id);
                }}
              >
                <motion.span
                  className={styles.socialGlyph}
                  animate={liked ? { scale: [1, 1.28, 1] } : { scale: 1 }}
                  transition={{ duration: 0.28 }}
                >
                  <HeartIcon size={26} weight={liked ? 'fill' : 'regular'} color={colors.iconPrimary} />
                </motion.span>
                <Text variant="bodyMedium" tabular>
                  {formatCount(likeCount)}
                </Text>
              </button>
              <button
                type="button"
                className={styles.socialButton}
                aria-label={`Open comments, ${comments.length} so far`}
                onClick={() => openComments(false)}
              >
                <span className={styles.socialGlyph}>
                  <ChatCircleIcon size={26} color={colors.iconPrimary} />
                </span>
                <Text variant="bodyMedium" tabular>
                  {formatCount(comments.length)}
                </Text>
              </button>
            </div>
            <button
              type="button"
              className={styles.caption}
              aria-expanded={captionOpen}
              onClick={() => setCaptionOpen((v) => !v)}
            >
              <Text variant="body" color="textSecondary" lines={captionOpen ? undefined : 3}>
                {look.caption}
              </Text>
            </button>
            <Text variant="caption" color="textMuted">{`${look.style} · ${look.occasion} · ${look.season}`}</Text>
            {comments.length ? (
              <div className={styles.preview}>
                {comments.length > 2 ? (
                  <button type="button" className={styles.previewAll} onClick={() => openComments(false)}>
                    <Text variant="body" color="textMuted">
                      {`View all ${formatCount(comments.length)} comments`}
                    </Text>
                  </button>
                ) : null}
                {/* The two newest, read top to bottom in the order they were written. */}
                {comments
                  .slice(0, 2)
                  .reverse()
                  .map((c) => (
                    <Text key={c.id} variant="body" as="p" lines={2}>
                      <Text variant="bodyMedium">{handleOf(c.authorId)}</Text>
                      {` ${c.text}`}
                    </Text>
                  ))}
              </div>
            ) : null}
            <button type="button" className={styles.addComment} onClick={() => openComments(true)}>
              <Avatar creatorId={ME} size={28} />
              <Text variant="body" color="textMuted">
                Add a comment…
              </Text>
            </button>
          </div>

          {/* What the Look costs, and the pieces the number is made of. */}
          <div className={styles.total}>
            <div className={styles.totalHead}>
              <Text variant="label" color="textMuted">
                Look total
              </Text>
              <Text variant="micro" color="textMuted" tabular>
                {`${identified} of ${look.pieces.length} identified`}
              </Text>
            </div>
            <Text variant="displayXL" as="div" tabular className={styles.totalPrice}>
              {formatPrice(lookTotal(look))}
            </Text>
            {shopping.length ? (
              <div className={styles.totalPieces}>
                <div className={styles.totalThumbs}>
                  {shopping.map((p) => (
                    <span key={p.id} className={styles.totalThumb}>
                      <Image src={productImage(p.id)} transition={0} />
                    </span>
                  ))}
                </div>
                <Text variant="micro" color="textMuted" tabular className={styles.totalRange}>
                  {prices[0] === prices[prices.length - 1]
                    ? formatPrice(prices[0])
                    : `${formatPrice(prices[0])} – ${formatPrice(prices[prices.length - 1])}`}
                </Text>
              </div>
            ) : null}
          </div>

          {/* Shop the Look */}
          <div className={styles.sectionHead}>
            <Text variant="h1" as="h2">
              Shop the Look
            </Text>
            <Text variant="label" color="textMuted">{`${look.pieces.length} pieces`}</Text>
          </div>
          {look.pieces.map((p, i) => (
            <PieceRow
              key={p.index}
              look={look}
              piece={p}
              toastBottom={toastBottom}
              onOpen={() => openPiece(i, 'row')}
            />
          ))}

          {/* More from the creator */}
          {more.length ? (
            <div style={{ paddingTop: space.s48 }}>
              <div className={styles.railHead}>
                <Text variant="label" color="textMuted">{`More from ${creator.name.split(' ')[0]}`}</Text>
              </div>
              <div className={`hscroll ${styles.rail}`}>
                {more.map((l) => (
                  <LookCard key={l.id} look={l} width={120} variant="rail" toastBottom={toastBottom} />
                ))}
              </div>
            </div>
          ) : null}

          {/* Similar Looks */}
          <div ref={similarRef} className={styles.sectionHead} style={{ paddingTop: space.s48 }}>
            <Text variant="h1" as="h2">
              Similar Looks
            </Text>
          </div>
          <Masonry looks={similar} containerWidth={W} toastBottom={insets.bottom + space.s16} />
        </div>
      </div>

      {/* Sticky action bar */}
      <motion.div
        className={styles.actionBar}
        style={{ height: actionBarH, paddingBottom: insets.bottom, pointerEvents: barHidden ? 'none' : 'auto' }}
        initial={false}
        animate={{ y: barHidden ? actionBarH + 2 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <SaveButton kind="look" id={look.id} variant="full" toastBottom={toastBottom} style={{ flex: 1 }} />
        <IconButton icon={ExportIcon} variant="outlined" aria-label="Share Look" onClick={onShare} />
      </motion.div>

      <PieceSheet
        look={look}
        selected={selected}
        open={sheetOpen}
        detent={detent}
        onDetentChange={setDetent}
        onSelect={selectPiece}
        onClose={closeSheet}
        onViewDetails={(pid) => navigate(`/product/${pid}`)}
        onShowAll={showAllPieces}
      />

      <PiecesSheet
        look={look}
        open={piecesOpen}
        selected={selected}
        markersOn={pinsOn}
        onMarkersChange={setPinsOn}
        onSelect={openFromList}
        onClose={() => setPiecesOpen(false)}
      />

      {/* Controls over the photo: a 60% scrim so they read on any image */}
      <motion.div
        className={styles.scrim}
        style={{ height: insets.top + 76 }}
        initial={false}
        animate={{ opacity: compactVisible ? 0 : 1 }}
        transition={{ duration: 0.15 }}
      />
      <div className={styles.controls} style={{ top: insets.top }}>
        <IconButton
          icon={CaretLeftIcon}
          variant="floating"
          aria-label="Back"
          onClick={() => (sheetOpen ? closeSheet() : navigate(-1))}
        />
        <IconButton icon={DotsThreeIcon} variant="floating" weight="bold" aria-label="More options" onClick={() => setMenuOpen(true)} />
      </div>

      {/* Compact top bar once the hero has scrolled away */}
      <motion.div
        className={styles.compact}
        style={{ paddingTop: insets.top, pointerEvents: compactVisible ? 'auto' : 'none' }}
        initial={false}
        animate={{ opacity: compactVisible ? 1 : 0 }}
        transition={{ duration: 0.15 }}
      >
        <div className={styles.compactLead}>
          <IconButton icon={CaretLeftIcon} disc aria-label="Back" onClick={() => navigate(-1)} />
        </div>
        <Text variant="captionMedium" lines={1} className={styles.compactTitle}>
          {`Look by ${creator.name}`}
        </Text>
        <div className={styles.compactActions}>
          {barHidden ? <SaveButton kind="look" id={look.id} variant="icon" toastBottom={insets.bottom + space.s16} /> : null}
          <IconButton icon={DotsThreeIcon} disc weight="bold" aria-label="More options" onClick={() => setMenuOpen(true)} />
        </div>
      </motion.div>

      <CommentsSheet
        look={look}
        open={commentsOpen}
        focusComposer={focusComposer}
        onClose={() => setCommentsOpen(false)}
      />

      <ActionMenu
        open={menuOpen}
        title="Look options"
        onClose={() => setMenuOpen(false)}
        options={[
          {
            label: 'See fewer like this',
            onSelect: () => showToast({ message: "We'll show fewer Looks like this", bottom: toastBottom }),
          },
          {
            label: 'Report',
            onSelect: () => showToast({ message: 'Thanks. We review every report.', bottom: toastBottom }),
          },
        ]}
      />
    </div>
  );
}
