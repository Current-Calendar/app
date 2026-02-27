import React from 'react';
import { 
    View, 
    Text, 
    Image, 
    StyleSheet, 
    TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ---------- Tipos ----------
export interface CalendarData {
    id: string | number;
    nombre: string;
    descripcion?: string;
    portada?: string;
    estado?: 'AMIGOS' | 'PUBLICO' | 'PRIVADO' | string; // ← puedes ajustar
}

interface CalendarCardProps {
    calendario: CalendarData;
    onPress?: () => void;
}

export default function CalendarCard({ calendario, onPress }: CalendarCardProps) {
    if (!calendario) return null;

    return (
        <TouchableOpacity 
            style={styles.cardContainer} 
            onPress={onPress} 
            activeOpacity={0.8}
        >
            <View style={styles.cardContent}>

                <Image 
                    source={{ uri: calendario.portada || 'https://via.placeholder.com/150' }} 
                    style={styles.cardImage} 
                />
                
                <View style={styles.cardDetails}>
                    
                    <View style={styles.titleRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                            {calendario.nombre}
                        </Text>

                        {calendario.estado === 'AMIGOS' && (
                            <Ionicons name="star" size={18} color="#A0D842" style={{ marginLeft: 6 }} />
                        )}
                    </View>
                    
                    <Text style={styles.cardDesc} numberOfLines={3}>
                        {calendario.descripcion || 'Sin descripción disponible.'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

// ---------- Estilos ----------
const styles = StyleSheet.create({
    cardContainer: { 
        backgroundColor: 'white', 
        borderRadius: 15, 
        marginBottom: 15, 
        borderWidth: 1.5, 
        borderColor: '#164E52',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardContent: { 
        flexDirection: 'row', 
        padding: 12
    },
    cardImage: { 
        width: 100, 
        height: 100, 
        borderRadius: 10 
    },
    cardDetails: { 
        flex: 1, 
        marginLeft: 12, 
        justifyContent: 'flex-start'
    },
    titleRow: { 
        flexDirection: 'row', 
        alignItems: 'center',
        marginBottom: 6
    },
    cardTitle: { 
        fontWeight: 'bold', 
        fontSize: 17, 
        color: '#164E52',
        flexShrink: 1 
    },
    cardDesc: { 
        fontSize: 13, 
        color: '#666', 
        lineHeight: 18,
    }
});