import {
  reactExtension,
  BlockStack,
  InlineStack,
  Text,
  View,
  Icon,
  Divider,
  useSettings,
  useTotalAmount,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.payment-method-list.render-before',
  () => <TrustBlock />,
);

function TrustBlock() {
  const settings = useSettings();
  const total = useTotalAmount();

  const threshold = Number(settings.free_shipping_threshold ?? 50);
  const returnsDays = Number(settings.returns_window_days ?? 30);
  const authenticityCopy = String(
    settings.authenticity_copy ??
      '100% authentic. Decanted from sealed bottles.',
  );

  const subtotal = total?.amount ?? 0;
  const remaining = Math.max(0, threshold - subtotal);
  const shippingLine =
    remaining > 0
      ? `$${remaining.toFixed(2)} away from free shipping`
      : 'Free shipping unlocked';

  return (
    <View
      border="base"
      cornerRadius="base"
      padding="base"
      blockAlignment="center"
    >
      <BlockStack spacing="tight">
        <Row icon="truck" label={shippingLine} />
        <Divider />
        <Row icon="checkmark" label={`${returnsDays}-day returns. No questions.`} />
        <Divider />
        <Row icon="lock" label={authenticityCopy} />
      </BlockStack>
    </View>
  );
}

function Row({ icon, label }: { icon: 'truck' | 'checkmark' | 'lock'; label: string }) {
  return (
    <InlineStack spacing="base" blockAlignment="center">
      <Icon source={icon} size="base" />
      <Text size="small">{label}</Text>
    </InlineStack>
  );
}
