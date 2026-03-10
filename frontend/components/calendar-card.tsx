import React from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calendarCardStyles } from '@/styles/calendar-styles';

// ---------- Tipos ----------
export interface CalendarData {
    id: string | number;
    nombre: string;
    descripcion?: string;
    portada?: string;
    estado?: 'AMIGOS' | 'PUBLICO' | 'PRIVADO' | string; // ? puedes ajustar
}

interface CalendarCardProps {
    calendario: CalendarData;
    onPress?: () => void;
}

export default function CalendarCard({ calendario, onPress }: CalendarCardProps) {
    if (!calendario) return null;

    return (
        <TouchableOpacity
            style={calendarCardStyles.cardContainer}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={calendarCardStyles.cardContent}>

                <Image
                    source={{ uri: calendario.portada || 'https://via.placeholder.com/150' }}
                    style={calendarCardStyles.cardImage}
                />

                <View style={calendarCardStyles.cardDetails}>

                    <View style={calendarCardStyles.titleRow}>
                        <Text style={calendarCardStyles.cardTitle} numberOfLines={1}>
                            {calendario.nombre}
                        </Text>

                        {calendario.estado === 'AMIGOS' && (
                            <Ionicons name="star" size={18} color="#A0D842" style={calendarCardStyles.friendStar} />
                        )}
                    </View>

                    <Text style={calendarCardStyles.cardDesc} numberOfLines={3}>
                        {calendario.descripcion || 'Sin descripciÃ³n disponible.'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

