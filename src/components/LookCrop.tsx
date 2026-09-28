import { lookImage, type Look } from '@/data/catalog';

type Props = { look: Look; x: number; y: number; width: number; height: number; zoom?: number };

/** Shows the real crop of an unidentified piece from the Look photo, zoomed around its hotspot. */
export function LookCrop({ look, x, y, width, height, zoom = 4 }: Props) {
  const imgW = width * zoom;
  const imgH = imgW / look.ratio;
  return (
    <div style={{ width, height, overflow: 'hidden', background: 'var(--c-bgSecondary)', position: 'relative' }}>
      <img
        src={lookImage(look.id)}
        alt=""
        draggable={false}
        style={{ position: 'absolute', width: imgW, height: imgH, maxWidth: 'none', left: width / 2 - x * imgW, top: height / 2 - y * imgH }}
      />
    </div>
  );
}
