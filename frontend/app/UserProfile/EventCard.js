import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EventCard({ event, onPress }) {
    if (!event) return null;

    return (
        <TouchableOpacity 
            style={styles.cardContainer} 
            onPress={onPress} 
            activeOpacity={0.8}
        >
            <View style={styles.cardContent}>
                <Image 
                    source={{ uri: event.foto || 'https://via.placeholder.com/150' }} 
                    style={styles.eventImage} 
                />
                
                <View style={styles.eventDetails}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                        {event.titulo}
                    </Text>

                    <Text style={styles.eventDesc} numberOfLines={2}>
                        {event.descripcion || 'Explora este evento marino...'}
                    </Text>

                    <View style={styles.infoRow}>
                        <View style={styles.infoCol}>
                            <Ionicons name="location-sharp" size={14} color="#F29B93" />
                            <Text style={styles.infoText} numberOfLines={1}>
                                {event.nombre_lugar || 'Ubicación...'}
                            </Text>
                        </View>
                        
                        <View style={[styles.infoCol, { flex: 0, marginLeft: 10 }]}> 
                            <Ionicons name="calendar-sharp" size={14} color="#F29B93" />
                            <Text style={styles.infoText}>
                                {event.fecha} • {event.hora?.substring(0, 5)} 
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    cardContainer: { 
        backgroundColor: 'white', 
        borderRadius: 15, 
        marginBottom: 15, 
        borderWidth: 1.5, 
        borderColor: '#F29B93',
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
    eventImage: { 
        width: 95, 
        height: 95, 
        borderRadius: 10 
    },
    eventDetails: { 
        flex: 1, 
        marginLeft: 12, 
        justifyContent: 'space-between'
    },
    eventTitle: { 
        fontWeight: 'bold', 
        fontSize: 16, 
        color: '#164E52',
        marginBottom: 2
    },
    eventDesc: { 
        fontSize: 12, 
        color: '#666', 
        lineHeight: 16,
        marginBottom: 4
    },
    infoRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between',
        marginTop: 5
    },
    infoCol: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        flex: 1 
    },
    infoText: { 
        fontSize: 10, 
        color: '#444', 
        marginLeft: 4,
        fontWeight: '500'
    }
});