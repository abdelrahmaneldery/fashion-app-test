import { useEffect, useState } from 'react';
import { importSourceByKey, type ImportSourceKey } from '@/data/importSources';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';
import { useViewport } from '@/hooks/useViewport';
import { track } from '@/lib/analytics';
import { importAdapters } from '@/lib/imports';
import { useSeamStore } from '@/store/useSeamStore';
import { useTheme } from '@/theme/theme';
import { BottomSheet, sheetDetent } from './BottomSheet';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { ArrowsLeftRightIcon, CheckIcon, LockSimpleIcon, XIcon } from './icons';
import styles from './ImportSignInSheet.module.css';
import { SourceLogo } from './SourceLogo';
import { Text } from './Text';

type Props = {
  /** The platform being signed in to, or null when the sheet is closed. */
  source: ImportSourceKey | null;
  onClose: () => void;
  /** Called once the account is connected, so the caller can open its photos. */
  onSignedIn: (source: ImportSourceKey) => void;
};

/**
 * The steps of a "Sign in with…" login, in order. SEAM only owns the first: the rest happen on the
 * platform's own site, which is why SEAM never has a password field for another service.
 *   intro     SEAM says what it will and will not see.
 *   page      The platform's sign-in page, where the email and password are typed. The demo shows
 *             it signing in, then moves on by itself.
 *   consent   The platform asks whether SEAM may see the account's photos.
 */
type Step = 'intro' | 'page' | 'consent';

/**
 * Signs in to a platform without leaving SEAM. In a real build the platform's pages load where the
 * `page` and `consent` steps sit, in a window showing the platform's address; until a platform approves
 * SEAM, a demo account stands in, and the screens say so.
 */
export function ImportSignInSheet({ source, onClose, onSignedIn }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useViewport();
  const { colors } = useTheme();
  const connectSource = useSeamStore((s) => s.connectSource);

  const [step, setStep] = useState<Step>('intro');
  const [handle, setHandle] = useState('');
  const [notice, setNotice] = useState<'cancelled' | 'failed' | null>(null);

  // Keep the last platform while the sheet slides away, and start every opening from the beginning.
  const [shown, setShown] = useState<ImportSourceKey | null>(source);
  const [opened, setOpened] = useState<ImportSourceKey | null>(null);
  if (source !== opened) {
    setOpened(source);
    if (source) {
      setShown(source);
      setStep('intro');
      setNotice(null);
      setHandle('');
    }
  }
  // On the platform's page, sign in and move to its permission step. Cancel drops a late answer.
  useEffect(() => {
    if (step !== 'page' || !shown) return;
    let live = true;
    importAdapters[shown]
      .signIn()
      .then((account) => {
        if (!live) return;
        setHandle(account.handle);
        setStep('consent');
      })
      .catch(() => {
        if (!live) return;
        setStep('intro');
        setNotice('failed');
      });
    return () => {
      live = false;
    };
  }, [step, shown]);

  if (!shown) return null;
  const { name, domain } = importSourceByKey[shown];

  /** Leaving the platform's pages without allowing access, the way closing its window would. */
  const cancel = () => {
    setStep('intro');
    setNotice('cancelled');
  };

  const allow = () => {
    connectSource(shown, handle);
    track({ name: 'import_signed_in', source: shown });
    onSignedIn(shown);
  };

  const onPlatform = step !== 'intro';

  const header = onPlatform ? (
    // Browser chrome: the address tells you whose page you are on.
    <div className={styles.chrome}>
      <button type="button" className={styles.chromeCancel} onClick={cancel}>
        <Text variant="bodyMedium">Cancel</Text>
      </button>
      <span className={styles.address} aria-label={`Secure page on ${domain}`}>
        <LockSimpleIcon size={12} weight="bold" color={colors.iconSecondary} aria-hidden="true" />
        <Text variant="captionMedium" color="textSecondary" lines={1}>
          {domain}
        </Text>
      </span>
      <span className={styles.chromeSide} aria-hidden="true" />
    </div>
  ) : (
    <div className={styles.header}>
      <IconButton icon={XIcon} aria-label="Close" onClick={onClose} />
    </div>
  );

  return (
    <BottomSheet
      open={!!source}
      heights={[sheetDetent(height, 0.82) + insets.bottom]}
      index={0}
      onIndexChange={() => {}}
      onRequestClose={onClose}
      scrim={[0.4, 0.4]}
      scrimClosesSheet
      handle={header}
      aria-label={step === 'intro' ? `Sign in to ${name}` : step === 'page' ? `Signing in to ${name}` : `Allow SEAM to access ${name}`}
    >
      {step === 'intro' ? (
        <div className={`scroll ${styles.body}`} style={{ paddingBottom: insets.bottom + 16 }}>
          <div className={styles.brand}>
            <SourceLogo source={shown} size={44} />
          </div>
          <Text variant="h2" as="h2" className={styles.center}>
            {`Sign in to ${name}`}
          </Text>
          <Text variant="body" color="textSecondary" as="p" className={styles.center}>
            {`Choose the photos you want in SEAM. You sign in on ${name}'s own page, so SEAM never sees your password.`}
          </Text>

          <ul className={styles.terms} aria-label="What SEAM can see">
            <li className={styles.term}>
              <CheckIcon size={18} weight="bold" color={colors.iconPrimary} aria-hidden="true" />
              <Text variant="body">Your photos, to choose from</Text>
            </li>
            <li className={styles.term}>
              <CheckIcon size={18} weight="bold" color={colors.iconPrimary} aria-hidden="true" />
              <Text variant="body">Your username, to show where a photo came from</Text>
            </li>
            <li className={styles.term}>
              <XIcon size={18} weight="bold" color={colors.iconSecondary} aria-hidden="true" />
              <Text variant="body" color="textSecondary">
                Never your password, messages or payments
              </Text>
            </li>
          </ul>

          <div className={styles.actions}>
            {notice ? (
              <Text variant="caption" color={notice === 'failed' ? 'error' : 'textSecondary'} role="status" className={styles.center}>
                {notice === 'failed'
                  ? `Couldn't reach ${name}. Check your connection and try again.`
                  : `Sign-in cancelled. Nothing was shared with SEAM.`}
              </Text>
            ) : null}
            <Button label={`Continue with ${name}`} onClick={() => setStep('page')} className={styles.cta} />
            <Text variant="caption" color="textMuted" as="p" className={styles.center}>
              Demo build: this connects a sample account.
            </Text>
          </div>
        </div>
      ) : (
        <div className={`scroll ${styles.page}`} style={{ paddingBottom: insets.bottom + 16 }}>
          {/* Everything below the address bar is the platform's page, not SEAM's. */}
          {step === 'page' ? (
            <div className={styles.loading} role="status">
              <SourceLogo source={shown} size={36} />
              <span className={styles.spinner} aria-hidden="true" />
              <Text variant="bodyMedium" color="textSecondary">
                {`Signing in to ${name}…`}
              </Text>
            </div>
          ) : (
            <>
              <div className={styles.pair} aria-hidden="true">
                <span className={styles.seam}>SEAM</span>
                <ArrowsLeftRightIcon size={20} color={colors.iconSecondary} />
                <SourceLogo source={shown} size={32} />
              </div>
              <Text variant="h2" as="h2" className={styles.center}>
                {`Allow SEAM to access your ${name} account?`}
              </Text>
              <Text variant="body" color="textSecondary" as="p" className={styles.center}>
                {`Signed in as ${handle}`}
              </Text>

              <ul className={styles.terms} aria-label="SEAM will be able to">
                <li className={styles.term}>
                  <CheckIcon size={18} weight="bold" color={colors.iconPrimary} aria-hidden="true" />
                  <Text variant="body">See your photos</Text>
                </li>
                <li className={styles.term}>
                  <CheckIcon size={18} weight="bold" color={colors.iconPrimary} aria-hidden="true" />
                  <Text variant="body">See your username</Text>
                </li>
              </ul>
              <Text variant="caption" color="textMuted" as="p" className={styles.center}>
                {`SEAM can't post, message or buy for you. You can remove its access at any time, in SEAM or in your ${name} settings.`}
              </Text>

              <div className={styles.actions}>
                <Button label="Allow" onClick={allow} className={styles.cta} />
                <Button variant="secondary" label="Cancel" onClick={cancel} className={styles.cta} />
              </div>
            </>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
