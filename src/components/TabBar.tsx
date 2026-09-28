import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@/theme/theme';
import { AddIcon, BookmarkIcon, ExploreIcon, HomeIcon, ProfileIcon, type NavIcon } from './NavIcons';
import styles from './TabBar.module.css';
import { Text } from './Text';

/**
 * The bar sits on a solid band under a hairline: 10px above the card, the 64px card, 12px below.
 * Screens reserve this much room at the foot of their scroll so nothing ends up underneath it.
 */
export const TAB_BAR_HEIGHT = 86;

type Tab = { to: string; label: string; icon: NavIcon };

const TABS: Tab[] = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/explore', label: 'Explore', icon: ExploreIcon },
  { to: '/create', label: 'Create a Look', icon: AddIcon },
  { to: '/lookbooks', label: 'Lookbooks', icon: BookmarkIcon },
  { to: '/profile', label: 'Profile', icon: ProfileIcon },
];

/**
 * Five destinations with the middle one raised onto a disc. A tab you are on swaps its outlined
 * glyph for the filled cut and takes the accent; the rest stay quiet.
 */
export function TabBar() {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className={styles.wrap} aria-label="Primary">
      <div className={styles.bar}>
        {TABS.map((tab) => {
          const spotlight = tab.to === '/create';
          const active =
            !spotlight &&
            (tab.to === '/'
              ? path === '/'
              : tab.to === '/explore'
                ? path.startsWith('/explore') || path.startsWith('/search') || path === '/visual-search'
                : path.startsWith(tab.to));
          const Glyph = tab.icon;

          // Create opens as a modal over whatever is behind it, so it is a button rather than a tab.
          if (spotlight) {
            return (
              <button
                key={tab.to}
                type="button"
                className={styles.spotlight}
                aria-label={tab.label}
                onClick={() => navigate('/create', { state: { background: location } })}
              >
                <span className={styles.disc}>
                  <Glyph size={22} color={colors.accentInverse} filled />
                </span>
              </button>
            );
          }

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={active ? `${styles.item} ${styles.active}` : styles.item}
            >
              <Glyph size={24} color={active ? colors.accent : colors.iconSecondary} filled={active} />
              <Text variant="micro" className={styles.label} color={active ? 'accent' : 'textMuted'}>
                {tab.label}
              </Text>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
