import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { creators, type Look } from '@/data/catalog';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useViewport } from '@/hooks/useViewport';
import { track } from '@/lib/analytics';
import { baselineCommentLikes, COMMENT_MAX, formatCount, ME, timeAgo } from '@/lib/social';
import { useSeamStore, type LookComment } from '@/store/useSeamStore';
import { useTheme } from '@/theme/theme';
import { Avatar } from './Avatar';
import { BottomSheet, sheetDetent } from './BottomSheet';
import styles from './CommentsSheet.module.css';
import { HeartIcon, XIcon } from './icons';
import { IconButton } from './IconButton';
import { Text } from './Text';

type Props = {
  look: Look;
  open: boolean;
  /** Opened from "Add a comment…", so the keyboard should come up with the sheet. */
  focusComposer: boolean;
  onClose: () => void;
};

/** The composer is a fixed row; toasts raised from inside the sheet sit just above it. */
const COMPOSER = 68;

/** How a commenter is named in a thread: their handle, without the @. */
export const handleOf = (authorId: string) => creators[authorId]?.handle.replace(/^@/, '') ?? authorId;

/** Every comment on a Look, newest first, with a composer pinned beneath them. */
export function CommentsSheet({ look, open, focusComposer, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useViewport();
  const { colors } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const all = useSeamStore((s) => s.comments);
  const likedComments = useSeamStore((s) => s.likedComments);
  const addComment = useSeamStore((s) => s.addComment);
  const deleteComment = useSeamStore((s) => s.deleteComment);
  const restoreComment = useSeamStore((s) => s.restoreComment);
  const toggleCommentLike = useSeamStore((s) => s.toggleCommentLike);
  const showToast = useSeamStore((s) => s.showToast);

  const comments = useMemo(
    () => all.filter((c) => c.lookId === look.id).sort((a, b) => b.at - a.at),
    [all, look.id],
  );

  const [draft, setDraft] = useState('');
  const [posted, setPosted] = useState('');
  const author = creators[look.creatorId];

  useEffect(() => {
    if (!open || !focusComposer) return;
    // After the sheet has travelled, so the keyboard does not fight the animation.
    const id = window.setTimeout(() => inputRef.current?.focus(), 280);
    return () => window.clearTimeout(id);
  }, [open, focusComposer]);

  const post = () => {
    const comment = addComment(look.id, draft);
    if (!comment) return;
    track({ name: 'comment_posted', lookId: look.id });
    setDraft('');
    setPosted(`Comment posted: ${comment.text}`);
    // Newest first, so a new comment lands at the top — make sure the top is where you are.
    listRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  const remove = (comment: LookComment) => {
    deleteComment(comment.id);
    showToast({
      message: 'Comment deleted',
      actionLabel: 'Undo',
      onAction: () => restoreComment(comment),
      bottom: COMPOSER + insets.bottom + 8,
    });
  };

  const header = (
    <div className={styles.header}>
      <span className={styles.headerSide} aria-hidden="true" />
      <div className={styles.headerTitle}>
        <Text variant="h3" as="h2">
          Comments
        </Text>
        {comments.length ? (
          <Text variant="caption" color="textMuted" tabular>
            {formatCount(comments.length)}
          </Text>
        ) : null}
      </div>
      <span className={styles.headerSide}>
        <IconButton icon={XIcon} aria-label="Close comments" onClick={onClose} />
      </span>
    </div>
  );

  return (
    <BottomSheet
      open={open}
      heights={[sheetDetent(height, 0.8) + insets.bottom]}
      index={0}
      onIndexChange={() => {}}
      onRequestClose={onClose}
      scrim={[0.4, 0.4]}
      scrimClosesSheet
      handle={header}
      aria-label={`Comments on ${author.name}'s Look`}
    >
      <div className={styles.body}>
        {comments.length ? (
          <ul ref={listRef} className={`scroll ${styles.list}`} aria-label="Comments">
            {comments.map((c) => {
              const mine = c.authorId === ME;
              const liked = !!likedComments[c.id];
              const likes = baselineCommentLikes(c.id, c.authorId) + (liked ? 1 : 0);
              const handle = handleOf(c.authorId);
              return (
                <li key={c.id} className={styles.comment}>
                  <Avatar creatorId={c.authorId} size={34} />
                  <div className={styles.commentBody}>
                    <div className={styles.commentHead}>
                      <Text variant="captionMedium">{mine ? `${handle} · you` : handle}</Text>
                      <Text variant="caption" color="textMuted">
                        {timeAgo(c.at)}
                      </Text>
                    </div>
                    <Text variant="body" as="p" className={styles.commentText}>
                      {c.text}
                    </Text>
                    {mine ? (
                      <button
                        type="button"
                        className={styles.delete}
                        aria-label="Delete your comment"
                        onClick={() => remove(c)}
                      >
                        <Text variant="micro" color="textMuted">
                          Delete
                        </Text>
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={styles.like}
                    aria-pressed={liked}
                    aria-label={`${liked ? 'Unlike' : 'Like'} comment by ${handle}`}
                    onClick={() => toggleCommentLike(c.id)}
                  >
                    <motion.span
                      className={styles.likeGlyph}
                      animate={liked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                      transition={{ duration: 0.25 }}
                    >
                      <HeartIcon
                        size={15}
                        weight={liked ? 'fill' : 'regular'}
                        color={liked ? colors.iconPrimary : colors.iconSecondary}
                      />
                    </motion.span>
                    {likes ? (
                      <Text variant="micro" color="textMuted" tabular>
                        {formatCount(likes)}
                      </Text>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.empty}>
            <Text variant="h3" as="p">
              No comments yet
            </Text>
            <Text variant="body" color="textSecondary" as="p">
              Say what you think of the Look.
            </Text>
          </div>
        )}

        <form
          className={styles.composer}
          style={{ paddingBottom: insets.bottom + 12 }}
          onSubmit={(e) => {
            e.preventDefault();
            post();
          }}
        >
          <Avatar creatorId={ME} size={34} />
          <input
            ref={inputRef}
            className={styles.input}
            value={draft}
            maxLength={COMMENT_MAX}
            placeholder={`Add a comment for ${author.name.split(' ')[0]}…`}
            aria-label="Add a comment"
            enterKeyHint="send"
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className={styles.send} disabled={!draft.trim()}>
            <Text variant="action" color={draft.trim() ? 'accentInverse' : 'textMuted'}>
              Post
            </Text>
          </button>
        </form>

        <span className="srOnly" role="status">
          {posted}
        </span>
      </div>
    </BottomSheet>
  );
}
