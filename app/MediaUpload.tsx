import React, { useState, useEffect } from 'react';
import { View, Button, FlatList, Image, Text, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadMedia, getMyMedia, deleteMedia } from '../hooks/authRequest';

export default function MediaUpload() {
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    try {
      const result = await getMyMedia();
      setMedia(result.media);
    } catch (err) {
      console.error('Load media error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    setUploading(true);

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library access');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      if (result.canceled) {
        setUploading(false);
        return;
      }

      const uri = result.assets[0].uri;
      const fileName = uri.split('/').pop() || 'image.jpg';
      const fileHash = `hash_${Date.now()}`; // In production, calculate actual hash

      // Upload to server with BRC-103 auth
      await uploadMedia(fileHash, fileName, uri);

      Alert.alert('Success', 'Media uploaded!');
      
      // Reload media list
      await loadMedia();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (mediaId: string) => {
    try {
      await deleteMedia(mediaId);
      Alert.alert('Success', 'Media deleted');
      await loadMedia();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Button 
        title={uploading ? "Uploading..." : "Upload Photo"} 
        onPress={handleUpload}
        disabled={uploading}
      />

      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={media}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.mediaItem}>
              <Text>{item.fileName}</Text>
              <Text style={styles.date}>
                {new Date(item.uploadedAt).toLocaleDateString()}
              </Text>
              <Button 
                title="Delete" 
                onPress={() => handleDelete(item._id)}
                color="red"
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  mediaItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  date: {
    color: '#666',
    fontSize: 12,
  },
});