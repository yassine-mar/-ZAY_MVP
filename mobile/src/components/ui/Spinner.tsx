import { ActivityIndicator, type ActivityIndicatorProps } from 'react-native';
import { colors } from '@/theme';

export function Spinner({
  size = 'small',
  color = colors.primary,
  ...rest
}: ActivityIndicatorProps) {
  return <ActivityIndicator size={size} color={color} {...rest} />;
}
