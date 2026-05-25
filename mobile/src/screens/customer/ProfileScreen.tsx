import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import {
  ChevronRight,
  User as UserIcon,
  MapPin,
  Bell,
  HelpCircle,
  LogOut,
  type LucideIcon,
} from 'lucide-react-native';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';

import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/auth.service';
import { formatPhone } from '@/utils/format';
import { colors, radii, shadows, spacing } from '@/theme';
import type { ProfileStackScreenProps } from '@/types/navigation.types';

interface MenuRow {
  icon: LucideIcon;
  label: string;
  description?: string;
  onPress: () => void;
  destructive?: boolean;
}

export function ProfileScreen(_: ProfileStackScreenProps<'Profile'>) {
  const { user } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Log out',
      "You'll need to sign in again to place orders or track existing ones.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => { void authService.logout(); },
        },
      ],
    );
  };

  const menuRows: MenuRow[] = [
    {
      icon: UserIcon,
      label: 'Edit profile',
      description: 'Name, phone number, profile photo',
      onPress: () => Alert.alert('Coming soon', 'Profile editing lands in the next slice.'),
    },
    {
      icon: MapPin,
      label: 'Saved addresses',
      description: 'Manage delivery locations',
      onPress: () => Alert.alert('Coming soon', 'Address book lands in the next slice.'),
    },
    {
      icon: Bell,
      label: 'Notifications',
      description: 'Push & email preferences',
      onPress: () => Alert.alert('Coming soon', 'Notification preferences in v1.1.'),
    },
    {
      icon: HelpCircle,
      label: 'Help & support',
      description: 'FAQ and contact',
      onPress: () => Alert.alert('Support', 'Email us at support@zay.ma'),
    },
  ];

  return (
    <SafeScreen edges={['top']}>
      <ScreenHeader title="Profile" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <View style={styles.headerCard}>
          <Avatar uri={user?.avatar_url} name={user?.name} size={72} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="h3" numberOfLines={1}>{user?.name ?? 'You'}</Text>
            <Text variant="bodySmall" color="text.secondary" numberOfLines={1}>
              {user?.email}
            </Text>
            {user?.phone ? (
              <Text variant="caption" color="text.tertiary">
                {formatPhone(user.phone)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuGroup}>
          {menuRows.map((row, i) => (
            <Pressable
              key={row.label}
              onPress={row.onPress}
              accessibilityRole="button"
              accessibilityLabel={row.label}
              style={({ pressed }) => [
                styles.menuRow,
                i !== menuRows.length - 1 && styles.menuRowBorder,
                pressed && { backgroundColor: colors.surfaceMuted },
              ]}
            >
              <View style={styles.rowIcon}>
                <row.icon size={18} color={colors.text.primary} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium">{row.label}</Text>
                {row.description ? (
                  <Text variant="caption" color="text.secondary">
                    {row.description}
                  </Text>
                ) : null}
              </View>
              <ChevronRight size={18} color={colors.text.tertiary} />
            </Pressable>
          ))}
        </View>

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          style={({ pressed }) => [
            styles.logoutRow,
            pressed && { backgroundColor: colors.surfaceMuted },
          ]}
        >
          <LogOut size={18} color={colors.feedback.error} strokeWidth={1.8} />
          <Text variant="bodyMedium" color="feedback.error">
            Log out
          </Text>
        </Pressable>

        <Text
          variant="caption"
          color="text.tertiary"
          align="center"
          style={styles.versionLabel}
        >
          @ZAY · v1.0.0
        </Text>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    ...shadows.sm,
  },
  menuGroup: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  versionLabel: {
    marginTop: spacing.lg,
  },
});
