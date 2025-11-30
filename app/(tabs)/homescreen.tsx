import { StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';


function MenuCard({ title, icon, color, onPress }: { title: string, icon: any, color: string, onPress: () => void }) {
    return (
        <TouchableOpacity style={[styles.card, { backgroundColor: color + '20' }]} onPress={onPress}>
            <IconSymbol name={icon} size={30} color={color} style={styles.cardIcon} />
            <ThemedText type="subtitle" style={[styles.cardTitle, { color }]}>{title}</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={color} />
        </TouchableOpacity>
    );
}


export default function HomeScreen() {
    const router = useRouter();
    return (
        <ParallaxScrollView headerImage={<></>}
        headerBackgroundColor={{ dark: '#121212', light: '#F0F8FF' }}>
            <ThemedView style={styles.titleContainer}>
                <ThemedText type="title">Dashboard</ThemedText>
            </ThemedView>


            <MenuCard
                title="Secure Camera"
                icon="camera.fill"
                color="#FF4500"
                onPress={() => router.push('/(tabs)/camera')}
            />
            <MenuCard
                title="View Gallery (Secured)"
                icon="photo.on.rectangle.fill"
                color="#1E90FF"
                onPress={() => router.push('/(tabs)/gallery')}
            />
            <MenuCard
                title="Share Media"
                icon="square.and.arrow.up.fill"
                color="#00B268"
                onPress={() => {
                    // Placeholder for sharing logic
                    alert('Sharing logic goes here: select media and create sharing TX.');
                }}
            />


            <ThemedView style={styles.infoContainer}>
                <ThemedText type="defaultSemiBold">
                    Blockchain Security Status:
                </ThemedText>
                <ThemedText>
                    All captured media metadata is secured on the BSV blockchain, ensuring non-repudiation and traceability via the embedded watermark data.
                </ThemedText>
            </ThemedView>


        </ParallaxScrollView>
    );
}


const styles = StyleSheet.create({
    titleContainer: {
        marginBottom: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    cardIcon: {
        marginRight: 15,
    },
    cardTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
    },
    infoContainer: {
        marginTop: 40,
        padding: 15,
        borderRadius: 10,
        backgroundColor: '#f0f0f0',
        gap: 8,
    },
});
