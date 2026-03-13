import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../theme/colors';
import { compressImage, isUnderSizeLimit } from '../utils/imageUtils';

export interface CaptureResult {
  base64: string;
  uri: string;
  bytes: number;
}

interface Props {
  trade: string;
  onCapture: (result: CaptureResult) => void;
  onError?: (msg: string) => void;
}

function HudCorners() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 900 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <>
      <Animated.View style={[styles.hudCorner, styles.cornerTL, animStyle]} />
      <Animated.View style={[styles.hudCorner, styles.cornerTR, animStyle]} />
      <Animated.View style={[styles.hudCorner, styles.cornerBL, animStyle]} />
      <Animated.View style={[styles.hudCorner, styles.cornerBR, animStyle]} />
    </>
  );
}

export default function ActoberCamera({ trade, onCapture, onError }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [thumbnail, setThumbnail] = React.useState<string | null>(null);
  const [isCapturing, setIsCapturing] = React.useState(false);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  // Permission denied state
  if (permission && !permission.granted && !permission.canAskAgain) {
    return (
      <View style={styles.permissionBanner}>
        <Text style={styles.permissionText}>📷 Camera needed for visual analysis</Text>
        <TouchableOpacity
          onPress={() => Linking.openSettings()}
          style={styles.settingsBtn}
        >
          <Text style={styles.settingsBtnText}>Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Permission not yet granted
  if (!permission?.granted) {
    return (
      <View style={styles.permissionBanner}>
        <Text style={styles.permissionText}>📷 Camera access needed</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.settingsBtn}>
          <Text style={styles.settingsBtnText}>Allow</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (isCapturing || !cameraRef.current) return;
    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        base64: false,
      });

      if (!photo?.uri) throw new Error('No photo captured');

      const compressed = await compressImage(photo.uri);

      if (!isUnderSizeLimit(compressed.bytes)) {
        onError?.('Image too large. Move closer or improve lighting.');
        return;
      }

      setThumbnail(photo.uri);
      onCapture({ base64: compressed.base64, uri: photo.uri, bytes: compressed.bytes });
    } catch (err: any) {
      onError?.(err.message ?? 'Capture failed');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={'back' as CameraType}
      >
        {/* HUD top-left */}
        <View style={styles.hudTopLeft}>
          <Text style={styles.hudText}>ACT</Text>
          <Text style={styles.hudText}>VISION: ACTIVE</Text>
          <Text style={[styles.hudText, styles.hudRec]}>REC ●</Text>
        </View>

        {/* HUD bottom-right */}
        <View style={styles.hudBottomRight}>
          <Text style={styles.hudText}>{timeStr}</Text>
          <Text style={styles.hudText}>{trade}</Text>
        </View>

        {/* Animated corner brackets */}
        <HudCorners />

        {/* Thumbnail top-right */}
        {thumbnail && (
          <View style={styles.thumbnailContainer}>
            <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
          </View>
        )}

        {/* Capture button */}
        <View style={styles.captureRow}>
          <TouchableOpacity
            style={[styles.captureBtn, isCapturing && styles.captureBtnActive]}
            onPress={handleCapture}
            disabled={isCapturing}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

// ── Simulator / no-camera fallback ────────────────────────────────────────────

export function CameraStandby({ trade, onSimCapture }: { trade: string; onSimCapture: () => void }) {
  const timeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  return (
    <View style={styles.container}>
      <View style={[styles.camera, styles.standby]}>
        <View style={styles.hudTopLeft}>
          <Text style={styles.hudText}>ACT</Text>
          <Text style={styles.hudText}>VISION: STANDBY</Text>
        </View>
        <View style={styles.hudBottomRight}>
          <Text style={styles.hudText}>{timeStr}</Text>
          <Text style={styles.hudText}>{trade}</Text>
        </View>
        <View style={[styles.hudCorner, styles.cornerTL]} />
        <View style={[styles.hudCorner, styles.cornerTR]} />
        <View style={[styles.hudCorner, styles.cornerBL]} />
        <View style={[styles.hudCorner, styles.cornerBR]} />
        <View style={styles.standbyCenter}>
          <Text style={styles.standbyIcon}>◉</Text>
          <Text style={styles.standbyText}>VISION STANDBY</Text>
          <Text style={styles.standbySubtext}>Camera unavailable on simulator</Text>
        </View>
        <View style={styles.captureRow}>
          <TouchableOpacity style={styles.captureBtn} onPress={onSimCapture}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#050505',
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
    position: 'relative',
  },
  standby: {
    backgroundColor: '#060606',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  hudTopLeft: {
    position: 'absolute',
    top: 10,
    left: 12,
    zIndex: 10,
    gap: 2,
  },
  hudBottomRight: {
    position: 'absolute',
    bottom: 48,
    right: 12,
    zIndex: 10,
    alignItems: 'flex-end',
    gap: 2,
  },
  hudText: {
    fontFamily: 'Courier New',
    fontSize: 10,
    color: Colors.primary,
    letterSpacing: 1,
  },
  hudRec: { color: Colors.danger },
  hudCorner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: Colors.primary,
  },
  cornerTL: { top: 8, left: 8, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: 8, right: 8, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: 40, left: 8, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: 40, right: 8, borderBottomWidth: 2, borderRightWidth: 2 },
  thumbnailContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 60,
    height: 40,
  },
  captureRow: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  captureBtnActive: {
    borderColor: Colors.primaryDim,
    opacity: 0.6,
  },
  captureInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
  },
  standbyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  standbyIcon: {
    fontSize: 28,
    color: Colors.border,
    marginBottom: 8,
  },
  standbyText: {
    fontFamily: 'Courier New',
    fontSize: 12,
    color: Colors.border,
    letterSpacing: 2,
    marginBottom: 4,
  },
  standbySubtext: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A00',
    borderWidth: 1,
    borderColor: '#555500',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 0,
  },
  permissionText: { fontSize: 13, color: '#CCCC00', flex: 1 },
  settingsBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  settingsBtnText: {
    fontFamily: 'Courier New',
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
