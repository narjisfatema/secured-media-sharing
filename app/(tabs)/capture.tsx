// app/(tabs)/capture.tsx - ✅ USING THE SAVE FUNCTION
import React, { useState, useRef } from 'react';
import { 
  View, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { saveImageToAppStorage } from '../../services/saveImagetoApp'; // ✅ IMPORT HERE

export default function CaptureScreen() {
  const router = useRouter();
  const cameraRef = useRef<any>(null);
  
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastCaptured, setLastCaptured] = useState<string | null>(null);

  const openCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Please allow camera access');
        return;
      }
    }
    setIsCameraMode(true);
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      console.log('📸 Capturing photo...');

      // =======================================
      // CAPTURE PHOTO (temporary URI)
      // =======================================
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });

      console.log('✅ Photo captured (temp):', photo.uri);

      // =======================================
      // ✅✅✅ SAVE TO APP STORAGE ✅✅✅
      // =======================================
      console.log('💾 Saving to app storage...');
      
      const result = await saveImageToAppStorage(photo.uri);
      
      console.log('✅✅✅ SAVED SUCCESSFULLY ✅✅✅');
      console.log('Saved URI:', result.savedUri);
      console.log('Image Key:', result.imageKey);

      // Update UI
      setLastCaptured(result.savedUri);
      setIsCameraMode(false);

      // =======================================
      // SHOW SUCCESS MESSAGE
      // =======================================
      Alert.alert(
        '✅ Photo Saved!',
        `Your photo is saved in app private storage.\n\nImage Key: ${result.imageKey}`,
        [
          {
            text: 'Add Watermark',
            onPress: () => router.push({
              pathname: '/watermarkeditor',
              params: { 
                imageUri: result.savedUri,
                imageKey: result.imageKey,
                captureTimestamp: result.metadata.timestamp,
              }
            })
          },
          {
            text: 'View Gallery',
            onPress: () => router.push('/(tabs)/gallery')
          },
          {
            text: 'Capture More',
            style: 'cancel',
            onPress: () => setIsCameraMode(true)
          }
        ]
      );

    } catch (error: any) {
      console.error('❌ Capture/Save failed:', error);
      Alert.alert(
        'Save Failed', 
        error.message || 'Could not save photo',
        [
          { text: 'Retry', onPress: capturePhoto },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  // =======================================
  // CAMERA VIEW
  // =======================================
  if (isCameraMode) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView 
          ref={cameraRef}
          style={styles.camera} 
          facing={facing}
        >
          <View style={styles.cameraOverlay}>
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setIsCameraMode(false)}
              >
                <MaterialIcons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              
              <View style={styles.titleBadge}>
                <MaterialIcons name="shield" size={20} color="#10b981" />
                <Text style={styles.titleBadgeText}>Private Capture</Text>
              </View>

              <TouchableOpacity 
                style={styles.flipButton}
                onPress={toggleCameraFacing}
              >
                <MaterialIcons name="flip-camera-ios" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomBar}>
              <View style={styles.captureButtonContainer}>
                {lastCaptured && (
                  <TouchableOpacity 
                    style={styles.thumbnailButton}
                    onPress={() => router.push('/(tabs)/gallery')}
                  >
                    <Image 
                      source={{ uri: lastCaptured }} 
                      style={styles.thumbnail}
                    />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
                  onPress={capturePhoto}
                  disabled={isCapturing}
                >
                  {isCapturing ? (
                    <ActivityIndicator color="#fff" size="large" />
                  ) : (
                    <View style={styles.captureButtonInner} />
                  )}
                </TouchableOpacity>

                <View style={styles.placeholder} />
              </View>

              <Text style={styles.captureHint}>
                {isCapturing ? '💾 Saving...' : '📱 Tap to capture'}
              </Text>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  // =======================================
  // MAIN SCREEN
  // =======================================
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="shield" size={64} color="#3b82f6" />
        <Text style={styles.title}>📸 Private Capture</Text>
        <Text style={styles.subtitle}>
          Photos saved only in app • Never touches device gallery
        </Text>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity 
          style={styles.mainButton} 
          onPress={openCamera}
        >
          <MaterialIcons name="camera-alt" size={32} color="#fff" />
          <Text style={styles.mainButtonText}>Open Camera</Text>
          <Text style={styles.mainButtonSubtext}>
            Capture → Auto-save to app storage
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.featuresBox}>
        <View style={styles.feature}>
          <MaterialIcons name="security" size={20} color="#10b981" />
          <Text style={styles.featureText}>100% Private - App storage only</Text>
        </View>
        <View style={styles.feature}>
          <MaterialIcons name="save" size={20} color="#3b82f6" />
          <Text style={styles.featureText}>Auto-saved on capture</Text>
        </View>
        <View style={styles.feature}>
          <MaterialIcons name="block" size={20} color="#ef4444" />
          <Text style={styles.featureText}>Never saved to device gallery</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.galleryLink}
        onPress={() => router.push('/(tabs)/gallery')}
      >
        <MaterialIcons name="photo-library" size={20} color="#3b82f6" />
        <Text style={styles.galleryLinkText}>View My Gallery</Text>
        <MaterialIcons name="arrow-forward" size={20} color="#3b82f6" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center', 
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: 'white',
  },
  subtitle: { 
    fontSize: 14, 
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  buttonGroup: {
    width: '100%',
    gap: 16,
  },
  mainButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  mainButtonText: { 
    color: '#fff', 
    fontSize: 22, 
    fontWeight: 'bold',
  },
  mainButtonSubtext: {
    color: '#e0e7ff',
    fontSize: 13,
    opacity: 0.9,
  },
  featuresBox: {
    marginTop: 32,
    gap: 12,
    width: '100%',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(59,130,246,0.05)',
    padding: 12,
    borderRadius: 8,
  },
  featureText: {
    color: '#94a3b8',
    fontSize: 14,
    flex: 1,
  },
  galleryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  galleryLinkText: {
    flex: 1,
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  titleBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    paddingBottom: 50,
    alignItems: 'center',
    gap: 16,
  },
  captureButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 40,
  },
  thumbnailButton: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: 60,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#fff',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  captureHint: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});