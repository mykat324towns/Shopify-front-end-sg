import { useEffect, useState } from 'react';
import {
  reactExtension,
  BlockStack,
  Text,
  View,
  useSettings,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.contact.render-after',
  () => <CollectorProof />,
);

const QUOTES: ReadonlyArray<{ quote: string; name: string; sku: string }> = [
  {
    quote: 'Lasted me six weeks of daily wear. The 5ml is the sweet spot.',
    name: 'Mark T.',
    sku: 'Le Beau Le Parfum',
  },
  {
    quote: 'Smells identical to the bottle I tested at the boutique. Atomizer is solid.',
    name: 'Devon R.',
    sku: 'Greenley',
  },
  {
    quote: 'Tried four scents under $40 instead of blowing $300 on a blind buy.',
    name: 'Jamal K.',
    sku: 'Vibrato',
  },
  {
    quote: 'Still getting compliments at hour eight. Projection is real.',
    name: 'Anthony S.',
    sku: 'Imagination',
  },
  {
    quote: 'Packed clean, arrived fast. Felt like opening a small luxury.',
    name: 'Owen P.',
    sku: 'Virgin Island Water',
  },
];

function CollectorProof() {
  const settings = useSettings();
  const intervalSec = Math.max(3, Number(settings.rotation_seconds ?? 7));

  const [idx, setIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % QUOTES.length);
    }, intervalSec * 1000);
    return () => clearInterval(t);
  }, [intervalSec]);

  const q = QUOTES[idx];

  return (
    <View padding={['base', 'none', 'none', 'none']}>
      <BlockStack spacing="extraTight">
        <Text size="small" emphasis="italic">
          {`"${q.quote}"`}
        </Text>
        <Text size="small" appearance="subdued">
          {`— ${q.name}, on ${q.sku}`}
        </Text>
      </BlockStack>
    </View>
  );
}
