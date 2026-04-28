import {
  reactExtension,
  BlockStack,
  InlineStack,
  Heading,
  Text,
  Button,
  View,
  useSettings,
  useShop,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.thank-you.block.render',
  () => <BuildTheCollection />,
);

function BuildTheCollection() {
  const settings = useSettings();
  const shop = useShop();

  const variantId = String(settings.recommended_variant_id ?? '').trim();
  const productHandle = String(settings.recommended_product_handle ?? '').trim();
  const discountCode = String(settings.discount_code ?? 'COLLECTOR20').trim();
  const headline = String(settings.headline ?? 'Build the collection.');
  const subhead = String(
    settings.subhead ?? 'Pair what you ordered with this 5ml. 20% off — collectors only.',
  );

  if (!variantId) return null;

  const origin = shop?.storefrontUrl ?? 'https://scentgallery.shop';
  const cartUrl = discountCode
    ? `${origin}/cart/${variantId}:1?discount=${encodeURIComponent(discountCode)}`
    : `${origin}/cart/${variantId}:1`;

  const productUrl = productHandle ? `${origin}/products/${productHandle}` : null;

  return (
    <View
      border="base"
      cornerRadius="base"
      padding="base"
    >
      <BlockStack spacing="base">
        <BlockStack spacing="extraTight">
          <Heading level={2}>{headline}</Heading>
          <Text size="small" appearance="subdued">
            {subhead}
          </Text>
        </BlockStack>

        <InlineStack spacing="base">
          <Button kind="primary" to={cartUrl}>
            Add at 20% off
          </Button>
          {productUrl && (
            <Button kind="secondary" to={productUrl}>
              See the bottle
            </Button>
          )}
        </InlineStack>

        <Text size="extraSmall" appearance="subdued">
          One-tap checkout. Same shipping address. Code {discountCode} applies automatically.
        </Text>
      </BlockStack>
    </View>
  );
}
