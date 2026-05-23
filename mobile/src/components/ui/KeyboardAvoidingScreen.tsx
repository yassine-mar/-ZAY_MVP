import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ViewStyle,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { spacing } from '@/theme';

interface Props {
  children: ReactNode;
  /** Wrap children in a ScrollView. Default true — almost every form needs it. */
  scrollable?: boolean;
  /** Dismiss the keyboard on tap outside an input. Default true. */
  dismissOnTap?: boolean;
  contentStyle?: ViewStyle;
}

/**
 * Wraps form content so the keyboard never overlaps inputs.
 *   - iOS uses 'padding' behavior (visually shifts the view up)
 *   - Android relies on its own windowSoftInput handling + 'height' as backup
 *
 * Tapping anywhere outside an input dismisses the keyboard, matching iOS
 * standard behavior.
 */
export function KeyboardAvoidingScreen({
  children,
  scrollable = true,
  dismissOnTap = true,
  contentStyle,
}: Props) {
  const Body = (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {scrollable ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </KeyboardAvoidingView>
  );

  if (!dismissOnTap) return Body;
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {Body}
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
