import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { layout, space } from '@/theme/tokens';

export function NotFound() {
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
        That page isn&rsquo;t here
      </Text>
      <Text variant="body" color="textSecondary" style={{ maxWidth: 560 }}>
        The link may be out of date. Everything you saved is still in All Saves.
      </Text>
      <Button label="Back to Home" variant="secondary" onClick={() => navigate('/')} style={{ alignSelf: 'flex-start' }} />
    </div>
  );
}
