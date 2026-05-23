import { Pressable, View, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Text } from './Text';
import { colors, spacing } from '@/theme';

interface Props {
  onBack: () => void;
  title?: string;
}

/**
 * Custom navigation header for auth screens — pure back chevron, no title
 * by default. Keeps screens visually quiet while still affording a hit
 * target large enough for thumbs.
 */
export function BackHeader({ onBack, title }: Props) {
  return (
    <View style={styles.root}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}
      >
        <ChevronLeft size={26} color={colors.text.primary} strokeWidth={2.2} />
      </Pressable>
      {title ? (
        <Text variant="bodyBold" style={styles.title}>
          {title}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.xs,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // visually center despite the back button
  },
});
