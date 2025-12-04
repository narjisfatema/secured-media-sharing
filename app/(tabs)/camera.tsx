// ============================================
// app/(tabs)/camera.tsx
// FIXED: Camera now unmounts & webcam light turns off
// ============================================

import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState, useRef } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const isFocused = useIsFocused();  // ⭐ Only mount camera when screen is focused

  // ⭐ Stop camera when screen is unfocused (turns webcam light OFF)
  useFocusEffect(() => {
    return () => {
      if (cameraRef.current) {
        try {
          cameraRef.current.pausePreview?.();
        } catch (err) {
          console.log("Camera stop error:", err);
        }
      }
    };
  });

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  async function takePicture() {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          base64: false,
        });

        if (photo) {
          console.log('Photo captured:', photo.uri);

          // navigate to watermark screen
          router.push({
            pathname: '/watermarkeditor',
            params: { imageUri: photo.uri }
          });
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to capture image. Please try again.');
      }
    }
  }

  return (
    <View style={styles.container}>
      {/* ⭐ Only render CameraView if screen is focused */}
      {isFocused && (
        <CameraView
          style={styles.camera}
          facing={facing}
          ref={cameraRef}
        >
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.flipButton}
              onPress={toggleCameraFacing}
            >
              <MaterialIcons name="flip-camera-ios" size={32} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePicture}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <View style={styles.placeholder} />
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: '#fff',
    fontSize: 16,
    paddingHorizontal: 20,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  flipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
  },
  placeholder: {
    width: 60,
  },
});

//the logic of above code is that it creates a camera screen using Expo's CameraView component. It handles camera permissions, allows toggling between front and back cameras, and captures photos. The camera is only active when the screen is focused, ensuring the webcam light turns off when navigating away. Captured photos are passed to a watermark editor screen for further processing.
// The useFocusEffect hook from @react-navigation/native is used to manage the camera's lifecycle based on screen focus.
// The useIsFocused hook is used to conditionally render the CameraView component only when the screen is focused.
// The cameraRef is used to access the CameraView methods for taking pictures and pausing the preview.
// The styles object defines the styling for various components in the camera screen.