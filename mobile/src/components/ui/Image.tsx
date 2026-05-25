import { Image as ExpoImage, type ImageProps as ExpoImageProps } from 'expo-image';
import { View, StyleSheet } from 'react-native';
import { Soup } from 'lucide-react-native';
import { colors } from '@/theme';

interface FoodImageProps extends Omit<ExpoImageProps, 'source'> {
  uri: string | null | undefined;
}

/**
 * expo-image with a deterministic fallback. When `uri` is null we render
 * a muted tile with a lucide icon so cards never collapse height — keeps
 * grid alignment stable while images are still loading or absent.
 */
export function FoodImage({ uri, style, ...rest }: FoodImageProps) {
  if (!uri) {
    return (
      <View style={[styles.fallback, style]}>
        <Soup size={28} color={colors.text.tertiary} strokeWidth={1.5} />
      </View>
    );
  }

  return (
    <ExpoImage
      source={{ uri }}
      contentFit="cover"
      transition={200}
      style={style}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
