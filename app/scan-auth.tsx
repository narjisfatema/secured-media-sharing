// --- Frontend: app/scan-auth.tsx (Conceptual) for Android/iOS---

import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { View, StyleSheet } from 'react-native';

const POLL_INTERVAL = 3000; // Check every 3 seconds

export default function ScanAuthScreen() {
    const { qrData, challenge } = useLocalSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState('Waiting for Wallet Scan...');

    useEffect(() => {
        let intervalId: number;

        const pollStatus = async () => {
            try {
                // Call the backend's status check route
                const response = await fetch(`https://your-backend.com/api/auth/status/${challenge}`);
                const data = await response.json();

                if (data.success && data.token) {
                    clearInterval(intervalId);
                    // 1. Store the JWT token securely (e.g., using expo-secure-store)
                    await AsyncStorage.setItem('authToken', data.token); // Use SecureStore in production!
                    
                    // 2. Redirect to the dashboard
                    router.replace('/dashboard'); 
                } else {
                    setStatus(data.status === 'pending' 
                        ? 'Waiting for Signature...' 
                        : 'Challenge expired or failed.'
                    );
                }
            } catch (error) {
                console.error('Polling failed:', error);
                setStatus('Network error. Retrying...');
            }
        };

        intervalId = setInterval(pollStatus, POLL_INTERVAL);

        // Cleanup the interval when the component is unmounted
        return () => clearInterval(intervalId);
    }, [challenge, router]);

    return (
        <View style={styles.container}>
            {/* Display the QR code here using the qrData parameter */}
            <ThemedText>Scan this QR code with your BSV Desktop Wallet to log in:</ThemedText>
            {/* <QRCode value={qrData} /> */} 
            <ThemedText>{status}</ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
});
// ... (styles)