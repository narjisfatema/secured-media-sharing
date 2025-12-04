import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { useState } from 'react';

export default function AuthScreen() {
    const router = useRouter();
    
    // ✅ ADD THIS FUNCTION
    const handleLogin = () => {
        router.push('/dashboard'); // Redirect to home screen after login
    };

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>
                SOCIAL LOGIN
            </ThemedText>
            <ThemedText>
                Login to securely capture, store, and share your media with blockchain verification.
            </ThemedText>
           
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Connect with BSV Wallet</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()}>
                <ThemedText style={styles.backLink}>
                    Don't have a wallet? Download SPV wallet here.
                </ThemedText>
            </TouchableOpacity>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        width: '100%',
    },
    title: {
        fontFamily: Fonts.rounded,
        marginBottom: 30,
        textAlign: 'center',
        alignSelf: 'center',
    },
    button: {
        backgroundColor: "green",
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
        width: '50%',
        alignSelf: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    backLink: {
        textAlign: 'center',
        marginTop: 20,
        textDecorationLine: 'underline',
    },
});

//the logic of above code is to create an authentication screen for a mobile app using React Native and Expo Router.
// It includes a title, description, and a button to connect with a BSV wallet for secure media handling.
// The handleLogin function redirects users to the dashboard screen upon successful login.
// The styles object defines the styling for various components in the authentication screen.