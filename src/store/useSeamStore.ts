import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { LookAudience } from '@/data/audience';
import type { ImportSourceKey } from '@/data/importSources';
import { COMMENT_MAX, ME } from '@/lib/social';
import type { ThemeName } from '@/theme/tokens';

export type SaveRef = { kind: 'look' | 'product'; id: string };

/** A platform someone has signed in to from Post a Look, and the name they signed in as. */
export type SourceConnection = { handle: string; at: number };

/** A photo brought into your SEAM account from another platform. */
export type ImportedImage = {
  id: string;
  source: ImportSourceKey;
  /** The platform's own id for the photo; the picture is resolved from it, never stored. */
  sourceId: string;
  addedAt: number;
};
export const refKey = (ref: SaveRef) => `${ref.kind}:${ref.id}`;
export const parseKey = (key: string): SaveRef => {
  const [kind, ...rest] = key.split(':');
  return { kind: kind as SaveRef['kind'], id: rest.join(':') };
};

export interface Lookbook {
  id: string;
  name: string;
  isPrivate: boolean;
  items: string[];
  updatedAt: number;
}

/** A comment on a Look, stored in the order it was written; screens choose their own order. */
export interface LookComment {
  id: string;
  lookId: string;
  /** A creator id — your own comments carry ME. */
  authorId: string;
  text: string;
  at: number;
}

export interface ToastState {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Distance from the bottom of the screen to the toast's bottom edge. */
  bottom: number;
}

export interface SaveSheetState {
  ref: SaveRef;
  theme: ThemeName;
  mode: 'file' | 'manage';
  /** Where the toast should sit once the sheet closes. */
  toastBottom: number;
  /** Increments on every open, so the sheet starts fresh each time. */
  session?: number;
}

/** The two app-wide colour modes. Bone is a surface, not a mode, so it is not offered here. */
export type AppTheme = 'light' | 'dark';

/** What the person asked for. `system` hands the decision back to the device, and is the default. */
export type ThemeMode = AppTheme | 'system';

const darkQuery = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

/** What the device is set to right now. Light wherever there is no media query to ask. */
export const deviceTheme = (): AppTheme => (darkQuery()?.matches ? 'dark' : 'light');

interface PersistedState {
  saves: Record<string, number>;
  lookbooks: Lookbook[];
  following: string[];
  hasSeenBreath: boolean;
  /** Chosen in Profile and remembered between visits. The device decides until someone picks a side. */
  themeMode: ThemeMode;
  /** Most recent first, newest at the front, capped so the list stays scannable. */
  recentSearches: string[];
  /** Looks you have liked, and when. */
  likedLooks: Record<string, number>;
  /** Every comment on every Look, in the order it was written. */
  comments: LookComment[];
  /** Comments you have liked, and when. */
  likedComments: Record<string, number>;
  /** Platforms signed in to from Post a Look. */
  connections: Partial<Record<ImportSourceKey, SourceConnection>>;
  /** Photos brought in from those platforms: your own images, shown on your profile. */
  importedImages: ImportedImage[];
  /** Who your next Look is for: the last audience you chose, so it never changes behind your back. */
  postAudience: LookAudience;
}

interface SeamState extends PersistedState {
  /** The device's appearance, mirrored here so `system` resolves without a second subscription. */
  systemTheme: AppTheme;
  saveSheet: SaveSheetState | null;
  toast: ToastState | null;
  save: (ref: SaveRef) => void;
  unsave: (ref: SaveRef) => void;
  restore: (ref: SaveRef, lookbookIds: string[]) => void;
  toggleInLookbook: (lookbookId: string, ref: SaveRef) => void;
  createLookbook: (name: string, isPrivate: boolean, ref?: SaveRef) => string;
  toggleFollow: (creatorId: string) => void;
  markBreathSeen: () => void;
  toggleLookLike: (lookId: string) => void;
  /** Only ever likes — a second double-tap on a photograph must not take the like back. */
  likeLook: (lookId: string) => void;
  /** Returns the comment, or null when there was nothing to post. */
  addComment: (lookId: string, text: string) => LookComment | null;
  deleteComment: (id: string) => void;
  /** Puts a deleted comment back exactly as it was, for Undo. */
  restoreComment: (comment: LookComment) => void;
  toggleCommentLike: (id: string) => void;
  connectSource: (source: ImportSourceKey, handle: string) => void;
  /** Signs out of a platform. Images already brought in stay on your profile. */
  disconnectSource: (source: ImportSourceKey) => void;
  /** Adds photos in the order given, skipping any already in. Returns how many were new. */
  addImportedImages: (source: ImportSourceKey, sourceIds: string[]) => number;
  setPostAudience: (audience: LookAudience) => void;
  setThemeMode: (mode: ThemeMode) => void;
  rememberSearch: (query: string) => void;
  forgetSearch: (query: string) => void;
  clearSearches: () => void;
  openSaveSheet: (sheet: SaveSheetState) => void;
  closeSaveSheet: () => void;
  showToast: (toast: Omit<ToastState, 'id'>) => void;
  hideToast: () => void;
}

const now = Date.now();
const HOUR = 3_600_000;
const said = (n: number, lookId: string, authorId: string, hoursAgo: number, text: string): LookComment => ({
  id: `c-seed-${n}`,
  lookId,
  authorId,
  text,
  at: now - hoursAgo * HOUR,
});

/**
 * A starting conversation, written by the app's own creators — never by a Look's author about
 * their own Look, and never by you, so nothing here puts words in your mouth.
 */
const SEED_COMMENTS: LookComment[] = [
  said(1, 'amira-soft-tailoring', 'omar', 5, "Where's the jacket from? The drape is perfect."),
  said(2, 'amira-soft-tailoring', 'lina', 2, 'The ivory against that black bag is exactly right.'),
  said(3, 'omar-underpass', 'sara', 26, 'Saving this for the rainy weeks.'),
  said(4, 'omar-underpass', 'karim', 1, 'Head to toe black, done properly. The trainers make it.'),
  said(5, 'karim-lobby', 'omar', 50, 'Need the trousers.'),
  said(6, 'karim-lobby', 'nour', 20, 'Clean. A shirt collar would have been one thing too many.'),
  said(7, 'karim-lobby', 'lina', 3, 'Brown shoes with the black suit is the move.'),
  said(8, 'lina-oatmeal-knit', 'sara', 6, 'Cream on cream always works in the city.'),
  said(9, 'sara-denim-uniform', 'karim', 30, 'Linen and a book. Correct.'),
  said(10, 'sara-denim-uniform', 'lina', 4, 'That blue against the grass.'),
  said(11, 'karim-street-polo', 'nour', 9, 'Understated in the best way.'),
  said(12, 'amira-rooftop-edit', 'omar', 74, 'Grey flannel over black is so good.'),
];

const seed: PersistedState = {
  saves: {
    'look:amira-rooftop-edit': now,
    'product:ode-linen-jacket': now,
    'look:lina-oatmeal-knit': now,
    'product:maren-ankle-boots': now,
    'product:orro-black-loafers': now,
    'look:amira-summer-linen': now,
    'product:callow-straw-tote': now,
  },
  lookbooks: [
    { id: 'lb-weekend', name: 'Weekend tailoring', isPrivate: false, updatedAt: now - 1000, items: ['look:amira-rooftop-edit', 'product:ode-linen-jacket', 'look:lina-oatmeal-knit'] },
    { id: 'lb-shoes', name: 'Shoes to buy', isPrivate: true, updatedAt: now - 2000, items: ['product:maren-ankle-boots', 'product:orro-black-loafers'] },
    { id: 'lb-summer', name: 'Summer in Cairo', isPrivate: false, updatedAt: now - 3000, items: ['look:amira-summer-linen', 'product:callow-straw-tote'] },
  ],
  following: ['lina'],
  hasSeenBreath: false,
  themeMode: 'system',
  recentSearches: [],
  likedLooks: {},
  comments: SEED_COMMENTS,
  connections: {},
  importedImages: [],
  postAudience: 'everyone',
  likedComments: {},
};

let toastId = 0;
let sheetSession = 0;
let commentSeq = 0;

export const useSeamStore = create<SeamState>()(
  persist(
    (set, get) => ({
      ...seed,
      systemTheme: deviceTheme(),
      saveSheet: null,
      toast: null,
      save: (ref) => set((s) => ({ saves: { ...s.saves, [refKey(ref)]: Date.now() } })),
      unsave: (ref) =>
        set((s) => {
          const key = refKey(ref);
          const saves = { ...s.saves };
          delete saves[key];
          return { saves, lookbooks: s.lookbooks.map((lb) => ({ ...lb, items: lb.items.filter((k) => k !== key) })) };
        }),
      restore: (ref, lookbookIds) =>
        set((s) => {
          const key = refKey(ref);
          return {
            saves: { ...s.saves, [key]: Date.now() },
            lookbooks: s.lookbooks.map((lb) =>
              lookbookIds.includes(lb.id) && !lb.items.includes(key) ? { ...lb, items: [key, ...lb.items] } : lb,
            ),
          };
        }),
      toggleInLookbook: (lookbookId, ref) =>
        set((s) => {
          const key = refKey(ref);
          return {
            saves: s.saves[key] ? s.saves : { ...s.saves, [key]: Date.now() },
            lookbooks: s.lookbooks.map((lb) => {
              if (lb.id !== lookbookId) return lb;
              const has = lb.items.includes(key);
              return { ...lb, updatedAt: Date.now(), items: has ? lb.items.filter((k) => k !== key) : [key, ...lb.items] };
            }),
          };
        }),
      createLookbook: (name, isPrivate, ref) => {
        const id = `lb-${Date.now().toString(36)}`;
        const items = ref ? [refKey(ref)] : [];
        set((s) => ({
          saves: ref ? { ...s.saves, [refKey(ref)]: s.saves[refKey(ref)] ?? Date.now() } : s.saves,
          lookbooks: [{ id, name: name.trim(), isPrivate, items, updatedAt: Date.now() }, ...s.lookbooks],
        }));
        return id;
      },
      toggleFollow: (creatorId) =>
        set((s) => ({
          following: s.following.includes(creatorId)
            ? s.following.filter((c) => c !== creatorId)
            : [...s.following, creatorId],
        })),
      markBreathSeen: () => set({ hasSeenBreath: true }),
      toggleLookLike: (lookId) =>
        set((s) => {
          const likedLooks = { ...s.likedLooks };
          if (likedLooks[lookId]) delete likedLooks[lookId];
          else likedLooks[lookId] = Date.now();
          return { likedLooks };
        }),
      likeLook: (lookId) =>
        set((s) => (s.likedLooks[lookId] ? {} : { likedLooks: { ...s.likedLooks, [lookId]: Date.now() } })),
      addComment: (lookId, text) => {
        const body = text.trim().slice(0, COMMENT_MAX);
        if (!body) return null;
        const at = Date.now();
        const comment: LookComment = { id: `c-${at.toString(36)}-${++commentSeq}`, lookId, authorId: ME, text: body, at };
        set((s) => ({ comments: [...s.comments, comment] }));
        return comment;
      },
      deleteComment: (id) =>
        set((s) => {
          const likedComments = { ...s.likedComments };
          delete likedComments[id];
          return { comments: s.comments.filter((c) => c.id !== id), likedComments };
        }),
      restoreComment: (comment) =>
        set((s) =>
          s.comments.some((c) => c.id === comment.id)
            ? {}
            : { comments: [...s.comments, comment].sort((a, b) => a.at - b.at) },
        ),
      toggleCommentLike: (id) =>
        set((s) => {
          const likedComments = { ...s.likedComments };
          if (likedComments[id]) delete likedComments[id];
          else likedComments[id] = Date.now();
          return { likedComments };
        }),
      connectSource: (source, handle) =>
        set((s) => ({ connections: { ...s.connections, [source]: { handle, at: Date.now() } } })),
      disconnectSource: (source) =>
        set((s) => {
          const connections = { ...s.connections };
          delete connections[source];
          return { connections };
        }),
      addImportedImages: (source, sourceIds) => {
        const have = new Set(get().importedImages.filter((i) => i.source === source).map((i) => i.sourceId));
        const fresh = sourceIds.filter((id) => !have.has(id));
        if (!fresh.length) return 0;
        const t = Date.now();
        // One millisecond apart, so the batch keeps the order it was picked in, newest first.
        const added = fresh.map((sourceId, i) => ({ id: `img-${source}-${sourceId}`, source, sourceId, addedAt: t - i }));
        set((s) => ({ importedImages: [...added, ...s.importedImages] }));
        return added.length;
      },
      setPostAudience: (postAudience) => set({ postAudience }),
      setThemeMode: (themeMode) => set({ themeMode }),
      rememberSearch: (query) =>
        set((s) => {
          const q = query.trim();
          if (!q) return {};
          return { recentSearches: [q, ...s.recentSearches.filter((r) => r !== q)].slice(0, 8) };
        }),
      forgetSearch: (query) => set((s) => ({ recentSearches: s.recentSearches.filter((r) => r !== query) })),
      clearSearches: () => set({ recentSearches: [] }),
      openSaveSheet: (sheet) => set({ saveSheet: { ...sheet, session: ++sheetSession } }),
      closeSaveSheet: () => set({ saveSheet: null }),
      showToast: (toast) => set({ toast: { ...toast, id: ++toastId } }),
      hideToast: () => {
        if (get().toast) set({ toast: null });
      },
    }),
    {
      name: 'seam-store-v1',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // v1 stored a light/dark choice. The device decides now, so that value is dropped rather
      // than pinning returning visitors to a mode they picked before there was a third option.
      migrate: (state, version) => {
        if (version >= 2) return state as PersistedState;
        const persisted = { ...(state as Record<string, unknown>) };
        delete persisted.theme;
        return { ...persisted, themeMode: 'system' } as unknown as PersistedState;
      },
      partialize: (s): PersistedState => ({
        saves: s.saves,
        lookbooks: s.lookbooks,
        following: s.following,
        hasSeenBreath: s.hasSeenBreath,
        themeMode: s.themeMode,
        recentSearches: s.recentSearches,
        likedLooks: s.likedLooks,
        comments: s.comments,
        likedComments: s.likedComments,
        connections: s.connections,
        importedImages: s.importedImages,
        postAudience: s.postAudience,
      }),
    },
  ),
);

/** The mode in force: what the person chose, or what the device says while they choose `system`. */
export const selectTheme = (s: { themeMode: ThemeMode; systemTheme: AppTheme }): AppTheme =>
  s.themeMode === 'system' ? s.systemTheme : s.themeMode;

/**
 * Keeps `systemTheme` current for as long as the app is open, so flipping the phone into dark
 * flips the app with it. Returns its own teardown, for the effect that starts it.
 */
export function watchSystemTheme() {
  const query = darkQuery();
  if (!query) return () => {};
  const sync = () => useSeamStore.setState({ systemTheme: query.matches ? 'dark' : 'light' });
  // The device may have changed while this tab was asleep.
  sync();
  query.addEventListener('change', sync);
  return () => query.removeEventListener('change', sync);
}

export const lookbooksContaining = (lookbooks: Lookbook[], key: string) => lookbooks.filter((lb) => lb.items.includes(key));
