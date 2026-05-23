import { type ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { colors } from '@/theme';

interface SafeScreenProps {
  children: ReactNode;
  edges?: ReadonlyArray<Edge>;
  background?: string;
  statusBarStyle?: StatusBarStyle;
  style?: ViewStyle;
}

/**
 * Standard screen wrapper:
 *   - applies safe area insets
 *   - sets the status bar style (auto-defaults to dark on light bg)
 *   - paints the background once so transitions don't flash white
 *
 * Edges default to ['top', 'bottom'] — most screens want both. Tab screens
 * with their own bottom bar pass edges={['top']}.
 */
export function SafeScreen({
  children,
  edges = ['top', 'bottom'],
  background = colors.background,
  statusBarStyle = 'dark',
  style,
}: SafeScreenProps) {
  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: background }, style]}
      edges={edges}
    >
      <StatusBar style={statusBarStyle} />
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
