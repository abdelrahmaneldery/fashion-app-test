import { useEffect } from 'react';
import { Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { SaveSheetHost } from '@/components/SaveSheetHost';
import { TabBar } from '@/components/TabBar';
import { ToastHost } from '@/components/ToastHost';
import { Create } from '@/screens/Create';
import { CreatorProfile } from '@/screens/CreatorProfile';
import { Explore } from '@/screens/Explore';
import { Home } from '@/screens/Home';
import { LookDetail } from '@/screens/LookDetail';
import { Lookbooks } from '@/screens/Lookbooks';
import { NotFound } from '@/screens/NotFound';
import { ProductDetail } from '@/screens/ProductDetail';
import { Search } from '@/screens/Search';
import { SimilarLooks } from '@/screens/SimilarLooks';
import { SearchResults } from '@/screens/SearchResults';
import { VisualSearch } from '@/screens/VisualSearch';
import { Profile } from '@/screens/Profile';
import { selectTheme, useSeamStore, watchSystemTheme } from '@/store/useSeamStore';
import { ThemeScope } from '@/theme/theme';
import styles from './App.module.css';

/** The four tabbed screens share the bottom bar; everything else covers it. */
function TabsLayout() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  );
}

export function App() {
  const scheme = useSeamStore(selectTheme);
  const location = useLocation();
  // Create was pushed from the tab bar, so the screen behind it keeps rendering.
  const background = (location.state as { background?: Location } | null)?.background;

  // The page itself carries the app-wide mode, so the body and the area beside the app column match.
  useEffect(() => {
    document.documentElement.dataset.theme = scheme;
  }, [scheme]);

  // Someone can change their device's appearance while the app is open; it should follow.
  useEffect(() => watchSystemTheme(), []);

  return (
    <ThemeScope name={scheme}>
      <div className={styles.shell}>
        <Routes location={background ?? location}>
          <Route element={<TabsLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/search/results" element={<SearchResults />} />
            <Route path="/lookbooks" element={<Lookbooks />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="/search" element={<Search />} />
          <Route path="/visual-search" element={<VisualSearch />} />
          <Route path="/creator/:id" element={<CreatorProfile />} />
          <Route path="/look/:id" element={<LookDetail />} />
          <Route path="/look/:id/similar" element={<SimilarLooks />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/create" element={<Create />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        {background ? (
          <Routes>
            <Route path="/create" element={<Create />} />
          </Routes>
        ) : null}
        <SaveSheetHost />
        <ToastHost />
      </div>
    </ThemeScope>
  );
}
