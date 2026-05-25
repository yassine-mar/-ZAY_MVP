import { useState } from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  ActionSheetIOS,
  Platform,
  Alert,
} from 'react-native';
import * as Picker from 'expo-image-picker';
import * as Manipulator from 'expo-image-manipulator';
import { Camera, ImageIcon, Pencil, X } from 'lucide-react-native';
import { Image } from 'expo-image';
import Toast from 'react-native-toast-message';

import { Text } from '@/components/ui/Text';
import { colors, radii, spacing } from '@/theme';
import type { PickedImage } from '@/types/domain.types';

interface Props {
  value: PickedImage | null;
  /** Existing remote image URL (when editing). */
  remoteUri?: string | null;
  onChange: (next: PickedImage | null) => void;
  /** Compress to this max width in px before returning. Default 1200. */
  maxWidth?: number;
  /** Aspect ratio for capture/crop. Default 4:3 (food cards). */
  aspect?: [number, number];
  label?: string;
}

/**
 * Tap → action sheet → Camera | Library | Remove.
 * Compresses to ≤1MB / max 1200px before returning a `PickedImage`.
 *
 * Compression matters: a Samsung 12MP photo is ~5MB. Uploading 5MB over
 * Moroccan 3G takes 30+ seconds. The same image at 1MB takes ~6 seconds.
 */
export function ImagePicker({
  value,
  remoteUri,
  onChange,
  maxWidth = 1200,
  aspect = [4, 3],
  label = 'Photo',
}: Props) {
  const [busy, setBusy] = useState(false);

  const previewUri = value?.uri ?? remoteUri ?? null;

  const requestThen = async (op: 'camera' | 'library') => {
    setBusy(true);
    try {
      const perm =
        op === 'camera'
          ? await Picker.requestCameraPermissionsAsync()
          : await Picker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission needed',
          op === 'camera'
            ? "We need camera access to take a photo. Enable it in your phone's settings."
            : "We need photo library access to pick an image. Enable it in your phone's settings.",
        );
        return;
      }

      const result =
        op === 'camera'
          ? await Picker.launchCameraAsync({
              mediaTypes: Picker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect,
              quality: 0.9,
            })
          : await Picker.launchImageLibraryAsync({
              mediaTypes: Picker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect,
              quality: 0.9,
            });

      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];

      // Compress + downscale to keep upload fast on 3G.
      const compressed = await Manipulator.manipulateAsync(
        asset.uri,
        asset.width > maxWidth ? [{ resize: { width: maxWidth } }] : [],
        { compress: 0.7, format: Manipulator.SaveFormat.JPEG },
      );

      onChange({
        uri: compressed.uri,
        width: compressed.width,
        height: compressed.height,
        mimeType: 'image/jpeg',
        fileName: asset.fileName ?? 'item.jpg',
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Could not load image',
        text2: err instanceof Error ? err.message : 'Try again',
      });
    } finally {
      setBusy(false);
    }
  };

  const showOptions = () => {
    const options = previewUri ? ['Take photo', 'Choose from library', 'Remove', 'Cancel'] : ['Take photo', 'Choose from library', 'Cancel'];
    const cancelIndex = options.length - 1;
    const destructiveIndex = previewUri ? 2 : undefined;

    const handle = (index: number) => {
      if (index === 0) requestThen('camera');
      else if (index === 1) requestThen('library');
      else if (previewUri && index === 2) onChange(null);
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex },
        handle,
      );
    } else {
      // Android: simple Alert-based picker.
      Alert.alert(label, undefined, [
        { text: 'Take photo', onPress: () => requestThen('camera') },
        { text: 'Choose from library', onPress: () => requestThen('library') },
        ...(previewUri
          ? [{ text: 'Remove', style: 'destructive' as const, onPress: () => onChange(null) }]
          : []),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  return (
    <View style={styles.root}>
      {label ? (
        <Text variant="bodySmallMedium" style={styles.label}>{label}</Text>
      ) : null}
      <Pressable
        onPress={showOptions}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={previewUri ? 'Replace photo' : 'Add photo'}
        style={({ pressed }) => [styles.frame, pressed && { opacity: 0.7 }]}
      >
        {previewUri ? (
          <>
            <Image
              source={{ uri: previewUri }}
              style={styles.preview}
              contentFit="cover"
            />
            <View style={styles.overlayBtn}>
              <Pencil size={14} color={colors.text.onPrimary} />
              <Text variant="caption" color="text.onPrimary">Edit</Text>
            </View>
            {value ? (
              <Pressable
                onPress={(e) => { e.stopPropagation(); onChange(null); }}
                style={styles.clearBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear photo"
              >
                <X size={14} color={colors.text.onPrimary} strokeWidth={2.5} />
              </Pressable>
            ) : null}
          </>
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.placeholderIcon}>
              <Camera size={20} color={colors.primary} />
            </View>
            <Text variant="bodySmallMedium" color="text.primary">
              {busy ? 'Loading…' : 'Add a photo'}
            </Text>
            <Text variant="caption" color="text.tertiary">
              Tap to take or choose
            </Text>
            <View style={styles.placeholderHint}>
              <ImageIcon size={12} color={colors.text.tertiary} />
              <Text variant="caption" color="text.tertiary">JPEG · max 1 MB</Text>
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  label: { marginBottom: 2 },
  frame: {
    aspectRatio: 4 / 3,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  placeholderIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  placeholderHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  overlayBtn: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radii.full,
  },
  clearBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 26,
    height: 26,
    borderRadius: radii.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
