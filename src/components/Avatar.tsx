import { avatarImage } from '@/data/catalog';
import { Image } from './Image';

export function Avatar({ creatorId, size }: { creatorId: string; size: number }) {
  return (
    <Image
      src={avatarImage(creatorId)}
      transition={0}
      style={{
        width: size,
        height: size,
        flex: `0 0 ${size}px`,
        borderRadius: '50%',
        background: 'var(--c-bgSecondary)',
      }}
    />
  );
}
