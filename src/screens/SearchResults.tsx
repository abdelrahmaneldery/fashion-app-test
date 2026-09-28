import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { FilterSheet } from '@/components/FilterSheet';
import { IconButton } from '@/components/IconButton';
import { CaretLeftIcon, SlidersIcon } from '@/components/icons';
import { LookCard } from '@/components/LookCard';
import { ProductCard } from '@/components/ProductCard';
import { SearchBar } from '@/components/SearchBar';
import { Text } from '@/components/Text';
import { columnsFor, columnWidthFor } from '@/components/Masonry';
import { useElementSize } from '@/hooks/useElementSize';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useBreakpoint } from '@/hooks/useViewport';
import { EMPTY_FILTERS, filterCount, search, type SearchFilters } from '@/lib/search';
import { useSeamStore } from '@/store/useSeamStore';
import { useTheme, useThemeColorMeta } from '@/theme/theme';
import { space } from '@/theme/tokens';
import styles from './SearchResults.module.css';

const CHROME = 118;

export function SearchResults() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const { colors } = useTheme();
  const [params, setParams] = useSearchParams();
  const [feedRef, feedSize] = useElementSize<HTMLDivElement>();
  const count = columnsFor(useBreakpoint());
  const remember = useSeamStore((s) => s.rememberSearch);
  useThemeColorMeta();

  const query = params.get('q') ?? '';
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const results = useMemo(() => search(query, filters), [query, filters]);
  const active = filterCount(filters);
  const width = columnWidthFor(feedSize.width, count);
  const toastBottom = insets.bottom + space.s16;

  return (
    <div className={styles.screen}>
      <div ref={feedRef} className={`scroll ${styles.feed}`}>
        <div style={{ paddingTop: insets.top + CHROME, paddingBottom: insets.bottom + space.s48 }}>
          {/* The screen says what it is to the eye; this says it to a screen reader. */}
          <Text variant="label" as="h1" className="srOnly">
            Search results
          </Text>
          {results.total === 0 ? (
            <div className={styles.empty}>
              <Text variant="h2" as="h2">
                Nothing for &ldquo;{query}&rdquo;
              </Text>
              <Text variant="body" color="textSecondary">
                Try a different word, or clear the filters.
              </Text>
              {active ? (
                <button type="button" className={styles.reset} onClick={() => setFilters(EMPTY_FILTERS)}>
                  <Text variant="action">Clear {active} filter{active === 1 ? '' : 's'}</Text>
                </button>
              ) : null}
            </div>
          ) : null}

          {results.creators.length ? (
            <>
              <Text variant="label" color="textMuted" as="div" className={styles.group}>
                Creators
              </Text>
              {results.creators.map((c) => (
                <Link key={c.id} to={`/creator/${c.id}`} className={styles.creatorRow}>
                  <Avatar creatorId={c.id} size={48} />
                  <span className={styles.creatorText}>
                    <Text variant="bodyMedium" as="div">
                      {c.name}
                    </Text>
                    <Text variant="caption" color="textMuted" lines={1} as="div">
                      {c.bio}
                    </Text>
                  </span>
                </Link>
              ))}
            </>
          ) : null}

          {results.looks.length ? (
            <>
              <Text variant="label" color="textMuted" as="div" className={styles.group}>
                {results.looks.length} Look{results.looks.length === 1 ? '' : 's'}
              </Text>
              <div className={styles.grid}>
                {results.looks.map((l) => (
                  <LookCard key={l.id} look={l} width={width} toastBottom={toastBottom} />
                ))}
              </div>
            </>
          ) : null}

          {results.products.length ? (
            <>
              <Text variant="label" color="textMuted" as="div" className={styles.group}>
                {results.products.length} piece{results.products.length === 1 ? '' : 's'}
              </Text>
              <div className={styles.grid}>
                {results.products.map((p) => (
                  <ProductCard key={p.id} product={p} width={width} toastBottom={toastBottom} />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className={styles.chrome} style={{ top: insets.top }}>
        <div className={styles.bar}>
          <IconButton icon={CaretLeftIcon} aria-label="Back" onClick={() => navigate(-1)} />
          <div className={styles.grow}>
            <SearchBar
              value={query}
              onChange={(v) => setParams(v ? { q: v } : {}, { replace: true })}
              onSubmit={() => remember(query)}
              onClear={() => setParams({}, { replace: true })}
            />
          </div>
          <button
            type="button"
            className={active ? `${styles.filter} ${styles.filterOn}` : styles.filter}
            aria-label={active ? `Filters, ${active} active` : 'Filter results'}
            onClick={() => setFilterOpen(true)}
          >
            <SlidersIcon size={22} weight="bold" color={active ? colors.accentInverse : colors.iconPrimary} />
          </button>
        </div>
        <Text variant="caption" color="textMuted" as="div" className={styles.count}>
          {results.total} result{results.total === 1 ? '' : 's'}
          {active ? ` · ${active} filter${active === 1 ? '' : 's'}` : ''}
        </Text>
      </div>
      <div className={styles.statusFill} style={{ height: insets.top }} />

      <FilterSheet
        open={filterOpen}
        value={filters}
        onApply={(next) => {
          setFilters(next);
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />
    </div>
  );
}
