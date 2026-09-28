import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AccountImagesSheet } from '@/components/AccountImagesSheet';
import { AudienceSheet } from '@/components/AudienceSheet';
import { IconButton } from '@/components/IconButton';
import { ImportSignInSheet } from '@/components/ImportSignInSheet';
import { CameraIcon, CaretRightIcon, ImagesIcon, LinkSimpleIcon, XIcon } from '@/components/icons';
import { SourceLogo } from '@/components/SourceLogo';
import { TagEditor, type LookTag } from '@/components/TagEditor';
import { Text } from '@/components/Text';
import { audienceByKey } from '@/data/audience';
import { styles as styleList } from '@/data/catalog';
import { importSources, type ImportSourceKey } from '@/data/importSources';
import { useOnEscape } from '@/hooks/useOnEscape';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { hostOf, normalizeUrl } from '@/lib/links';
import { useSeamStore } from '@/store/useSeamStore';
import { useTheme, useThemeColorMeta } from '@/theme/theme';
import { space } from '@/theme/tokens';
import styles from './Create.module.css';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Past this point across the photo, a tag's label is drawn to its left so it stays in frame. */
const FLIP_AT = 0.58;

/** Movement that counts as a drag rather than a tap, in pixels. */
const DRAG_SLOP = 4;

/**
 * Post a Look: choose a photograph, then tag it. Tapping anywhere on the photo places a tag and
 * asks what it is and where it links — the authoring side of the Eyelets the Look screen reads.
 */
export function Create() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const location = useLocation();
  const { colors } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const showToast = useSeamStore((s) => s.showToast);
  useThemeColorMeta();

  // Opened from a photo on your profile, the Look starts with that photo already in place.
  const [photo, setPhoto] = useState<string | null>(() => (location.state as { photo?: string } | null)?.photo ?? null);
  const [style, setStyle] = useState<string>(styleList[1] ?? 'Tailored');
  const [tags, setTags] = useState<LookTag[]>([]);
  const [editing, setEditing] = useState<LookTag | null>(null);
  const [isNew, setIsNew] = useState(false);
  const connections = useSeamStore((s) => s.connections);
  const [signingIn, setSigningIn] = useState<ImportSourceKey | null>(null);
  const [browsing, setBrowsing] = useState<ImportSourceKey | null>(null);
  const audience = useSeamStore((s) => s.postAudience);
  const setAudience = useSeamStore((s) => s.setPostAudience);
  const [choosingAudience, setChoosingAudience] = useState(false);
  // The Look's own link: where Visit site takes people. Tidied when the field is left, checked on Post.
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);
  const tidyLink = () => {
    const tidy = normalizeUrl(link);
    if (tidy === null) setLinkError(true);
    else setLink(tidy);
  };
  const shownTo = audienceByKey[audience];
  const AudienceGlyph = shownTo.icon;

  /** Both cards land here; the only difference between them is which picker the phone opens. */
  const choose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // The previous photo's blob would otherwise be held for the life of the tab.
    if (photo?.startsWith('blob:')) URL.revokeObjectURL(photo);
    setPhoto(URL.createObjectURL(file));
    setTags([]);
    setEditing(null);
  };

  const close = () => navigate(-1);
  // While the editor or a sheet is open it owns Escape; otherwise Escape leaves the screen.
  useOnEscape(!editing && !signingIn && !browsing && !choosingAudience, close);

  const pointFrom = (clientX: number, clientY: number, box: DOMRect) => ({
    x: clamp01((clientX - box.left) / box.width),
    y: clamp01((clientY - box.top) / box.height),
  });

  const place = (e: React.MouseEvent<HTMLButtonElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    // A photo still being decoded has no box to measure against, and no fraction to place into.
    if (!box.width || !box.height) return;
    const point = pointFrom(e.clientX, e.clientY, box);
    setIsNew(true);
    setEditing({ id: `tag-${Date.now().toString(36)}`, name: '', brand: '', url: '', ...point });
  };

  const edit = (tag: LookTag) => {
    setIsNew(false);
    setEditing(tag);
  };

  const saveTag = (tag: LookTag) => {
    setTags((list) => (list.some((t) => t.id === tag.id) ? list.map((t) => (t.id === tag.id ? tag : t)) : [...list, tag]));
    setEditing(null);
  };

  const removeTag = (id: string) => {
    setTags((list) => list.filter((t) => t.id !== id));
    setEditing(null);
  };

  // Dragging a marker moves the tag; letting go without moving opens it for editing.
  const drag = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const onMarkerDown = (tag: LookTag) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: tag.id, x: e.clientX, y: e.clientY, moved: false };
  };

  const onMarkerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const held = drag.current;
    const box = canvasRef.current?.getBoundingClientRect();
    if (!held || !box?.width || !box.height) return;
    if (!held.moved && Math.hypot(e.clientX - held.x, e.clientY - held.y) < DRAG_SLOP) return;
    held.moved = true;
    const point = pointFrom(e.clientX, e.clientY, box);
    setTags((list) => list.map((t) => (t.id === held.id ? { ...t, ...point } : t)));
  };

  const onMarkerUp = () => {
    suppressClick.current = !!drag.current?.moved;
    drag.current = null;
  };

  const post = () => {
    if (normalizeUrl(link) === null) {
      setLinkError(true);
      linkRef.current?.focus();
      return;
    }
    showToast({
      message: `Posting arrives with the creator API. This Look is set to ${shownTo.label}.`,
      bottom: insets.bottom + space.s24,
    });
    close();
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Post a Look"
      className={styles.screen}
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + space.s16 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className={styles.file}
        aria-label="Choose a photo for your Look"
        onChange={choose}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className={styles.file}
        aria-label="Take a photo for your Look"
        onChange={choose}
      />

      <div className={styles.bar}>
        <IconButton icon={XIcon} aria-label="Close" onClick={close} />
        <Text variant="h3" as="h1" className={styles.title}>
          Post a Look
        </Text>
        <button
          type="button"
          className={styles.post}
          disabled={!photo}
          aria-label={`Post, visible to ${shownTo.label}`}
          onClick={post}
        >
          <Text variant="action" color={photo ? 'accentInverse' : 'textMuted'}>
            Post
          </Text>
        </button>
      </div>

      <div className={`scroll ${styles.body}`}>
        {photo ? (
          <>
            <div ref={canvasRef} className={styles.canvas}>
              <img src={photo} alt="Your Look" className={styles.shot} />
              <button type="button" className={styles.addLayer} aria-label="Tap the photo to add a tag" onClick={place} />
              {tags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={styles.mark}
                  style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%` }}
                  aria-label={`Edit the tag ${t.name}`}
                  onPointerDown={onMarkerDown(t)}
                  onPointerMove={onMarkerMove}
                  onPointerUp={onMarkerUp}
                  onPointerCancel={onMarkerUp}
                  onClick={() => {
                    if (suppressClick.current) {
                      suppressClick.current = false;
                      return;
                    }
                    edit(t);
                  }}
                >
                  <span className={styles.markRing} />
                  <span className={t.x > FLIP_AT ? `${styles.markLabel} ${styles.markLabelLeft}` : styles.markLabel}>
                    {t.url ? <LinkSimpleIcon size={11} weight="bold" color="#FFFFFF" /> : null}
                    <Text variant="microUpper" style={{ color: '#FFFFFF' }} lines={1}>
                      {t.name}
                    </Text>
                  </span>
                </button>
              ))}
            </div>

            <div className={styles.tagsHead}>
              <Text variant="label" color="textMuted" as="h2">
                {tags.length ? `Tags · ${tags.length}` : 'Tags'}
              </Text>
              {tags.length ? (
                <button type="button" className={styles.clear} onClick={() => setTags([])}>
                  <Text variant="label" color="textMuted">
                    Clear all
                  </Text>
                </button>
              ) : null}
            </div>

            {tags.length ? (
              <ul className={styles.tagList}>
                {tags.map((t, i) => (
                  <li key={t.id} className={styles.tagRow}>
                    <button type="button" className={styles.tagMain} onClick={() => edit(t)}>
                      <span className={styles.tagIndex}>
                        <Text variant="micro" color="textSecondary" tabular>
                          {i + 1}
                        </Text>
                      </span>
                      <span className={styles.tagText}>
                        <Text variant="bodyMedium" as="div" lines={1}>
                          {t.name}
                        </Text>
                        <Text variant="caption" color="textMuted" as="div" lines={1}>
                          {[t.brand, t.url ? hostOf(t.url) : 'No link'].filter(Boolean).join(' · ')}
                        </Text>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.tagRemove}
                      aria-label={`Remove the tag ${t.name}`}
                      onClick={() => removeTag(t.id)}
                    >
                      <XIcon size={16} weight="bold" color={colors.iconSecondary} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <Text variant="caption" color="textMuted" as="p" className={styles.tagEmpty}>
                Tap anywhere on the photo to add one.
              </Text>
            )}

            <Text variant="label" color="textMuted" as="h2" className={styles.group}>
              Style
            </Text>
            <div className={styles.slots}>
              {styleList
                .filter((s) => s !== 'All')
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={style === s}
                    className={style === s ? `${styles.slot} ${styles.slotOn}` : styles.slot}
                    onClick={() => setStyle(s)}
                  >
                    <Text variant="action" color={style === s ? 'actionInverse' : 'textSecondary'}>
                      {s}
                    </Text>
                  </button>
                ))}
            </div>

            <Text variant="label" color="textMuted" as="h2" className={styles.group}>
              Link
            </Text>
            <div className={styles.link}>
              <input
                ref={linkRef}
                className={linkError ? `${styles.linkInput} ${styles.linkInvalid}` : styles.linkInput}
                value={link}
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="yoursite.com/this-look"
                enterKeyHint="done"
                aria-label="Link"
                aria-invalid={linkError}
                aria-describedby="look-link-help"
                onChange={(e) => {
                  setLink(e.target.value);
                  setLinkError(false);
                }}
                onBlur={tidyLink}
              />
              <Text
                id="look-link-help"
                variant="caption"
                color={linkError ? undefined : 'textMuted'}
                as="p"
                role={linkError ? 'alert' : undefined}
                style={linkError ? { color: colors.error } : undefined}
              >
                {linkError
                  ? "That link isn't a web address. Check it, or leave the field empty."
                  : 'Where Visit site takes people from your Look, like your blog post or shop. Optional.'}
              </Text>
            </div>

            {/* The last choice before Post, always on show, so nobody posts to more people than they meant to. */}
            <Text variant="label" color="textMuted" as="h2" className={styles.group}>
              Who can see this
            </Text>
            <button
              type="button"
              className={styles.audience}
              aria-haspopup="dialog"
              aria-label={`Who can see this: ${shownTo.label}. Change`}
              onClick={() => setChoosingAudience(true)}
            >
              <span className={styles.audienceIcon}>
                <AudienceGlyph size={20} color={colors.iconPrimary} />
              </span>
              <span className={styles.audienceText}>
                <Text variant="bodyMedium" as="span">
                  {shownTo.label}
                </Text>
                <Text variant="caption" color="textMuted" as="span">
                  {shownTo.line}
                </Text>
              </span>
              <CaretRightIcon size={18} color={colors.iconSecondary} />
            </button>

            <div className={styles.footer}>
              <button type="button" className={styles.swap} onClick={() => fileRef.current?.click()}>
                <Text variant="action">Change photo</Text>
              </button>
            </div>
          </>
        ) : (
          <div className={styles.picker}>
            {/* The two ways in that work today, side by side and equal in size. */}
            <div className={styles.choices}>
              <button
                type="button"
                className={`${styles.choice} ${styles.choiceLead}`}
                onClick={() => cameraRef.current?.click()}
              >
                <span className={`${styles.choiceIcon} ${styles.choiceIconLead}`}>
                  <CameraIcon size={24} weight="regular" color={colors.actionInverse} />
                </span>
                <Text variant="bodyMedium" as="div">
                  Take a photo
                </Text>
                <Text variant="caption" color="textMuted" as="div">
                  Use your camera
                </Text>
              </button>

              <button type="button" className={styles.choice} onClick={() => fileRef.current?.click()}>
                <span className={styles.choiceIcon}>
                  <ImagesIcon size={24} weight="regular" color={colors.iconPrimary} />
                </span>
                <Text variant="bodyMedium" as="div">
                  Choose from photos
                </Text>
                <Text variant="caption" color="textMuted" as="div">
                  Select a full look
                </Text>
              </button>
            </div>

            {/* A Look already posted elsewhere: one card per platform, stacked, each with its own Connect. */}
            <Text variant="label" color="textMuted" as="h2" className={styles.sourcesHead}>
              Import from
            </Text>
            <ul className={styles.sourceList}>
              {importSources.map((s) => {
                const connection = connections[s.key];
                return (
                  <li key={s.key} className={styles.sourceRow}>
                    <span className={styles.sourceText}>
                      <span className={styles.sourceBrand}>
                        <SourceLogo source={s.key} size={24} />
                        {/* A wordmark already spells the name; an icon needs it written beside it. */}
                        {s.mark.spellsName ? (
                          <span className="srOnly">{s.name}</span>
                        ) : (
                          <Text variant="bodyMedium">{s.name}</Text>
                        )}
                      </span>
                      <Text variant="caption" color="textMuted" as="div">
                        {connection ? `Connected as ${connection.handle}` : s.line}
                      </Text>
                    </span>
                    {/* Signed in once, the account opens straight onto its photos next time. */}
                    <button
                      type="button"
                      className={styles.connect}
                      aria-label={connection ? `Add images from ${s.name}` : `Connect ${s.name}`}
                      onClick={() => (connection ? setBrowsing(s.key) : setSigningIn(s.key))}
                    >
                      <Text variant="action">{connection ? 'Add images' : 'Connect'}</Text>
                    </button>
                  </li>
                );
              })}
            </ul>

            <Text variant="caption" color="textMuted" as="p" className={styles.pickerNote}>
              Full length works best — every piece needs to be visible for people to tap it.
            </Text>
          </div>
        )}
      </div>

      <TagEditor tag={editing} isNew={isNew} onSave={saveTag} onRemove={removeTag} onClose={() => setEditing(null)} />
      <ImportSignInSheet
        source={signingIn}
        onClose={() => setSigningIn(null)}
        onSignedIn={(source) => {
          setSigningIn(null);
          setBrowsing(source);
        }}
      />
      <AccountImagesSheet source={browsing} onClose={() => setBrowsing(null)} />
      <AudienceSheet
        open={choosingAudience}
        value={audience}
        onChange={setAudience}
        onClose={() => setChoosingAudience(false)}
      />
    </motion.div>
  );
}
