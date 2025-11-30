import { StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';


export default function indexScreen() {
    const router = useRouter();
    return (
        <ParallaxScrollView
            headerBackgroundColor={{ light: '#F0F8FF', dark: '#0A1A26' }}
            headerImage={
                <IconSymbol
                    size={200}
                    color="#1E90FF"
                    name="shield.checkerboard"
                    style={styles.headerImage}
                />
            }>
            <ThemedView style={styles.container}>
                <ThemedText
                    type="title"
                    style={{
                        fontFamily: Fonts.rounded,
                        marginBottom: 10,
                    }}>
                    Display Plane
                </ThemedText>
                <TouchableOpacity onPress={() => router.push('/auth')}>
                    <ThemedText type="subtitle" style={styles.tagline}>
                        Blockchain-based secured multimedia sharing, preventing deepfakes
                    </ThemedText>
                </TouchableOpacity>
            </ThemedView>
        </ParallaxScrollView>
    );
}
const styles = StyleSheet.create({
    headerImage: {
        marginTop: 20,
        marginBottom: 10,
    },
    container: {
        alignItems: 'center',
        padding: 20,
    },
    tagline: {
        textAlign: 'center',
        textDecorationLine: 'underline',
        textDecorationStyle: 'dotted',
        textDecorationColor: '#1E90FF',
        marginTop: 10,
        fontSize: 16,
    },
});
