import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { useState } from 'react';


export default function AuthScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');


    const handleLogin = () => {
        // Add your authentication logic here
        console.log('Login attempt:', { email, password });
        router.push('/homescreen'); // Redirect to home screen after login
    };


    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>
                SOCIAL LOGIN
            </ThemedText>
           
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />
           
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
           
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Sign In</Text>
            </TouchableOpacity>
           
            <TouchableOpacity onPress={() => router.back()}>
                <ThemedText style={styles.backLink}>
                    Back to Home
                </ThemedText>
            </TouchableOpacity>
        </ThemedView>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 10,
        width: '50%',
    },
    title: {
        fontFamily: Fonts.rounded,
        textAlign: 'center',
        marginBottom: 30,
    },
    input: {
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    button: {
        backgroundColor: '#1E90FF',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    backLink: {
        textAlign: 'center',
        marginTop: 20,
        textDecorationLine: 'underline',
    },
});

