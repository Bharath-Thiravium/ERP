import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';

interface InlineCameraProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string) => void;
}

const { width, height } = Dimensions.get('window');

const InlineCamera: React.FC<InlineCameraProps> = ({ visible, onClose, onCapture }) => {
  const [camera, setCamera] = useState<Camera | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const devices = useCameraDevices();
  const device = devices.find((cameraDevice) => cameraDevice.position === 'front')
    || devices.find((cameraDevice) => cameraDevice.position === 'back');

  useEffect(() => {
    if (visible) {
      requestCameraPermission();
    }
  }, [visible]);

  const requestCameraPermission = async () => {
    try {
      const permission = await Camera.requestCameraPermission();
      setHasPermission(permission === 'granted');
      if (permission === 'denied') {
        Alert.alert('Camera Permission', 'Camera permission is required to take photos');
      }
    } catch (error) {
      console.log('Camera permission error:', error instanceof Error ? error.message : error);
      Alert.alert('Error', 'Failed to request camera permission');
    }
  };

  const takePicture = async () => {
    if (camera && !isCapturing && device) {
      setIsCapturing(true);
      try {
        const photo = await camera.takePhoto();
        onCapture(`file://${photo.path}`);
        onClose();
      } catch (error) {
        Alert.alert('Error', 'Failed to capture photo');
      } finally {
        setIsCapturing(false);
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        {!hasPermission ? (
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>Camera permission required</Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : !device ? (
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>No camera available</Text>
            <TouchableOpacity style={styles.permissionButton} onPress={onClose}>
              <Text style={styles.permissionButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Camera
            ref={(ref) => setCamera(ref)}
            style={styles.camera}
            device={device}
            isActive={visible && hasPermission && !!device}
            photo={true}
            enableZoomGesture={false}
          >
            {/* Camera Overlay */}
            <View style={styles.overlay}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Face Verification</Text>
                <View style={styles.placeholder} />
              </View>

              {/* Face Guide */}
              <View style={styles.faceGuideContainer}>
                <View style={styles.faceGuide}>
                  <Text style={styles.guideText}>Position your face in the circle</Text>
                </View>
              </View>

              {/* Bottom Controls */}
              <View style={styles.bottomControls}>
                <View style={styles.instructionContainer}>
                  <Text style={styles.instructionText}>
                    • Look directly at the camera{'\n'}
                    • Ensure good lighting{'\n'}
                    • Remove glasses if possible
                  </Text>
                </View>
                
                <View style={styles.captureContainer}>
                  <TouchableOpacity
                    style={[styles.captureButton, isCapturing && styles.capturingButton]}
                    onPress={takePicture}
                    disabled={isCapturing}
                  >
                    <View style={styles.captureButtonInner} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Camera>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  faceGuideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuide: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 3,
    borderColor: '#00ff00',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,255,0,0.1)',
  },
  guideText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  bottomControls: {
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  instructionContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
  },
  instructionText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
  },
  captureContainer: {
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#007AFF',
  },
  capturingButton: {
    backgroundColor: '#ccc',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InlineCamera;
