import { Text } from '@/components/ui/Text';
import { formatPrice } from '@/utils/format';

interface Props {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'inverse';
}

export function PriceTag({ amount, size = 'md', color = 'primary' }: Props) {
  return (
    <Text
      variant={size === 'lg' ? 'h3' : size === 'sm' ? 'bodySmallMedium' : 'bodyBold'}
      color={color === 'primary' ? 'primary' : 'text.onPrimary'}
    >
      {formatPrice(amount)}
    </Text>
  );
}
