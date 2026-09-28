import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '@/components/IconButton';
import { CaretLeftIcon, MagnifyingGlassIcon, XIcon } from '@/components/icons';
import { SearchBar } from '@/components/SearchBar';
import { Text } from '@/components/Text';
import { suggestedQueries } from '@/lib/search';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useSeamStore } from '@/store/useSeamStore';
import { useTheme, useThemeColorMeta } from '@/theme/theme';
import { space } from '@/theme/tokens';
import styles from './Search.module.css';

const CHROME = 64;

/** The typing screen: recent queries, then suggestions. Submitting goes to the results. */
export function Search() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const { colors } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  useThemeColorMeta();

  const recents = useSeamStore((s) => s.recentSearches);
  const remember = useSeamStore((s) => s.rememberSearch);
  const forget = useSeamStore((s) => s.forgetSearch);
  const clearAll = useSeamStore((s) => s.clearSearches);

  const run = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    remember(trimmed);
    navigate(`/search/results?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className={styles.screen}>
      <div className={`scroll ${styles.body}`}>
        <div style={{ paddingTop: insets.top + CHROME, paddingBottom: insets.bottom + space.s32 }}>
          {/* The screen says what it is to the eye; this says it to a screen reader. */}
          <Text variant="label" as="h1" className="srOnly">
            Search
          </Text>
          {recents.length ? (
            <>
              <div className={styles.sectionHead}>
                <Text variant="h3" as="h2">
                  Recent
                </Text>
                <button type="button" className={styles.link} onClick={clearAll}>
                  <Text variant="captionMedium" color="textSecondary">
                    Clear all
                  </Text>
                </button>
              </div>
              {recents.map((q) => (
                <div key={q} style={{ position: 'relative' }}>
                  <button type="button" className={styles.row} onClick={() => run(q)}>
                    <span className={styles.rowIcon}>
                      <MagnifyingGlassIcon size={18} weight="bold" color={colors.iconSecondary} />
                    </span>
                    <Text variant="bodyL" lines={1} className={styles.rowText}>
                      {q}
                    </Text>
                    <span
                      className={styles.dismiss}
                      role="button"
                      tabIndex={-1}
                      aria-label={`Remove ${q}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        forget(q);
                      }}
                    >
                      <XIcon size={16} weight="bold" color={colors.iconSecondary} />
                    </span>
                  </button>
                </div>
              ))}
            </>
          ) : null}

          <div className={styles.sectionHead}>
            <Text variant="h3" as="h2">
              Try searching for
            </Text>
          </div>
          <div className={styles.chips}>
            {suggestedQueries.map((q) => (
              <button key={q} type="button" className={styles.chip} onClick={() => run(q)}>
                <Text variant="action" color="textSecondary">
                  {q}
                </Text>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.chrome} style={{ top: insets.top }}>
        <IconButton icon={CaretLeftIcon} aria-label="Back" onClick={() => navigate(-1)} />
        <div className={styles.grow}>
          <SearchBar
            ref={inputRef}
            value={query}
            onChange={setQuery}
            onSubmit={() => run(query)}
            onClear={() => setQuery('')}
            onCamera={() => navigate('/visual-search')}
            autoFocus
          />
        </div>
      </div>
      <div className={styles.statusFill} style={{ height: insets.top }} />
    </div>
  );
}
