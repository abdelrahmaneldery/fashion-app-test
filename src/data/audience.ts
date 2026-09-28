import { GlobeSimpleIcon, LockSimpleIcon, UsersIcon, type Icon } from '@/components/icons';

/**
 * Who a Look is for. The keys match `public.look_audience` in the database, which enforces them:
 * the app only shows the choice.
 */
export type LookAudience = 'everyone' | 'followers' | 'only_me';

export type AudienceOption = { key: LookAudience; label: string; line: string; icon: Icon };

export const audiences: readonly AudienceOption[] = [
  { key: 'everyone', label: 'Everyone', line: 'Anyone on SEAM. It can appear in For You.', icon: GlobeSimpleIcon },
  { key: 'followers', label: 'Followers', line: 'Only people who follow you.', icon: UsersIcon },
  { key: 'only_me', label: 'Only me', line: 'Just you. It stays on your profile, hidden from everyone else.', icon: LockSimpleIcon },
];

export const audienceByKey = Object.fromEntries(audiences.map((a) => [a.key, a])) as Record<LookAudience, AudienceOption>;
