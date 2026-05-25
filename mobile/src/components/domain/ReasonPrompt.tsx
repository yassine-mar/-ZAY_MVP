import { useState } from 'react';
import {
  Modal,
  Pressable,
  View,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors, radii, spacing, typography } from '@/theme';

interface Props {
  visible: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  confirmLabel: string;
  destructive?: boolean;
  minLength?: number;
  onConfirm: (reason: string) => Promise<void> | void;
  onClose: () => void;
}

/**
 * Bottom-sheet prompt that requires a textual reason before confirming a
 * destructive action (cancel order, etc.).
 *
 * Used by the seller cancel flow and by the customer auto-cancel-and-tell-us
 * variant if we ever build it.
 */
export function ReasonPrompt({
  visible,
  title,
  description,
  placeholder = 'Briefly explain to the customer…',
  confirmLabel,
  destructive = false,
  minLength = 10,
  onConfirm,
  onClose,
}: Props) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const valid = reason.trim().length >= minLength;

  const handleConfirm = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => !submitting && onClose()}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <Pressable
          onPress={() => !submitting && onClose()}
          style={styles.backdrop}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.card}>
            <Text variant="h3">{title}</Text>
            {description ? (
              <Text variant="bodySmall" color="text.secondary" style={{ marginTop: spacing.xs }}>
                {description}
              </Text>
            ) : null}

            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={placeholder}
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={styles.input}
              autoFocus
              accessibilityLabel="Reason"
            />

            <View style={styles.counter}>
              <Text variant="caption" color="text.tertiary">
                {reason.length < minLength
                  ? `${minLength - reason.length} more character${
                      minLength - reason.length === 1 ? '' : 's'
                    } needed`
                  : 'Looks good'}
              </Text>
            </View>

            <View style={styles.actions}>
              <Button
                onPress={onClose}
                variant="ghost"
                disabled={submitting}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                onPress={handleConfirm}
                variant={destructive ? 'destructive' : 'primary'}
                disabled={!valid}
                loading={submitting}
                style={{ flex: 1 }}
              >
                {confirmLabel}
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: spacing.sm,
  },
  input: {
    ...typography.body,
    color: colors.text.primary,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    minHeight: 96,
    backgroundColor: colors.surface,
  },
  counter: {
    alignItems: 'flex-end',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
