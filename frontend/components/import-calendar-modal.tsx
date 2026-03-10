import { Modal, View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { importGoogleCalendar, importICS, importIOSCalendar } from '@/services/calendarService';
import { Alert } from 'react-native';

interface Props {
    visible: boolean;
    onClose: () => void;
}

export function ImportCalendarModal({ visible, onClose }: Props) {
    const [iosModalVisible, setIosModalVisible] = useState(false);
    const [iosUrl, setIosUrl] = useState('');

    const handleICS = async () => {
        try {
            const result = await importICS();
            Alert.alert("ICS importado", `Se importaron ${result?.imported_count || 0} eventos`);
            onClose();
        } catch {
            Alert.alert("Error", "No se pudo importar el calendario ICS");
        }
    };

    const handleGoogle = async () => {
        try {
            const result = await importGoogleCalendar();
            Alert.alert("Google Calendar", `Se importaron ${result?.imported_count || 0} eventos`);
            onClose();
        } catch {
            Alert.alert("Error", "No se pudo importar desde Google Calendar");
        }
    };

    const handleIOS = async () => {
        try {
            const result = await importIOSCalendar(iosUrl);
            Alert.alert("iOS Calendar", `Se importaron ${result?.imported_count || 0} eventos`);
            setIosModalVisible(false);
            setIosUrl('');
            onClose();
        } catch {
            Alert.alert("Error", "No se pudo importar desde iOS Calendar");
        }
    };

    return (
        <>
            <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
                <Pressable style={styles.overlay} onPress={onClose}>
                    <View style={styles.card}>
                        <Text style={styles.title}>Importar calendario</Text>

                        <Pressable style={styles.option} onPress={() => { onClose(); setIosModalVisible(true); }}>
                            <View style={[styles.circle, { backgroundColor: '#d1faff' }]}>
                                <Ionicons name="logo-apple" size={20} color="#10464d" />
                            </View>
                            <View>
                                <Text style={styles.optionTitle}>iOS</Text>
                                <Text style={styles.optionDesc}>Apple Calendar</Text>
                            </View>
                        </Pressable>

                        <Pressable style={styles.option} onPress={handleGoogle}>
                            <View style={[styles.circle, { backgroundColor: '#fde0dd' }]}>
                                <MaterialCommunityIcons name="google" size={20} color="#10464d" />
                            </View>
                            <View>
                                <Text style={styles.optionTitle}>Google Calendar</Text>
                                <Text style={styles.optionDesc}>Sincronizar con Google</Text>
                            </View>
                        </Pressable>

                        <Pressable style={styles.option} onPress={handleICS}>
                            <View style={[styles.circle, { backgroundColor: '#eae0ff' }]}>
                                <MaterialCommunityIcons name="file" size={20} color="#10464d" />
                            </View>
                            <View>
                                <Text style={styles.optionTitle}>Archivo .ICS</Text>
                                <Text style={styles.optionDesc}>Subir desde dispositivo</Text>
                            </View>
                        </Pressable>

                        <Pressable style={styles.closeBtn} onPress={onClose}>
                            <Ionicons name="close" size={22} color="#888" />
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* iOS URL modal */}
            <Modal transparent visible={iosModalVisible} animationType="fade" onRequestClose={() => setIosModalVisible(false)}>
                <View style={styles.iosOverlay}>
                    <View style={styles.iosCard}>
                        <View style={styles.iosHeader}>
                            <Text style={styles.iosHeaderText}>Importar calendario iOS</Text>
                        </View>
                        <View style={styles.iosBody}>
                            <TextInput
                                style={styles.input}
                                placeholder="https://..."
                                placeholderTextColor="#10464d"
                                value={iosUrl}
                                onChangeText={setIosUrl}
                            />
                            <View style={styles.iosButtons}>
                                <Pressable style={styles.cancelBtn} onPress={() => setIosModalVisible(false)}>
                                    <Text style={{ color: '#10464d' }}>Cancelar</Text>
                                </Pressable>
                                <Pressable style={styles.submitBtn} onPress={handleIOS}>
                                    <Text style={{ color: '#fff' }}>Importar</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: 280,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: '#888',
        marginBottom: 16,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        alignSelf: 'stretch',
        paddingVertical: 10,
    },
    circle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#10464d',
    },
    optionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#10464d',
    },
    optionDesc: {
        fontSize: 12,
        color: '#10464d',
        opacity: 0.6,
    },
    closeBtn: {
        marginTop: 8,
        padding: 8,
    },
    iosOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    iosCard: {
        width: '90%',
        maxWidth: 400,
        borderRadius: 16,
        backgroundColor: '#fffded',
        overflow: 'hidden',
    },
    iosHeader: {
        backgroundColor: '#10464d',
        paddingVertical: 14,
        alignItems: 'center',
    },
    iosHeaderText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    iosBody: {
        padding: 20,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#10464d',
        marginBottom: 16,
    },
    iosButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cancelBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#fcfcfc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#10464d',
    },
    submitBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#10464d',
        borderRadius: 12,
    },
});