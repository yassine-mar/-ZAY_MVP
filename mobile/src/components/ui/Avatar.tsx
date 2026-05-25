import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Text } from './Text';
import { colors, radii } from '@/theme';

interface AvatarProps {
  uri: string | null | undefined;
  /** Fallback initials when no image is available. */
  name?: string;
  size?: number;
}

/**
 * Circular avatar with letter fallback. Uses expo-image so the cache is
 * shared with other Image usages app-wide.
 */
export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const initials = (name ?? '')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View
      style={[
        styles.root,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <Text
          variant="bodyBold"
          style={{ fontSize: size * 0.4, color: colors.primary }}
        >
          {initials || '?'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
