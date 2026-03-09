import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
    importGoogleCalendar,
    importICS,
    importIOSCalendar
} from "@/services/calendarService";

const FONT_FAMILY = "Jost-Medium";

export default function ImportCalendarScreen() {
    const [loading, setLoading] = useState(false);
    const [iosModalVisible, setIosModalVisible] = useState(false);
    const [iosUrl, setIosUrl] = useState("");

    const handleICS = async () => {
        try {
            const result = await importICS(1);      //Meter currentUserId
            Alert.alert("ICS importado", `Se importaron ${result?.imported_count || 0} eventos`);
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "No se pudo importar el calendario ICS");
        }
    };

    const handleGoogle = async () => {
        try {
            const result = await importGoogleCalendar();
            Alert.alert("Google Calendar", `Se importaron ${result?.imported_count || 0} eventos`);
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "No se pudo importar desde Google Calendar");
        }
    };

    const handleIOS = async () => {
        try {
            const result = await importIOSCalendar(iosUrl, 1);  //Meter currentUserId
            Alert.alert("iOS Calendar", `Se importaron ${result?.imported_count || 0} eventos`);
            setIosModalVisible(false);
            setIosUrl("");
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "No se pudo importar desde iOS Calendar");
        }
    };


    return (
        <View style={styles.container}>
            <View style={styles.card}>

                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Importar calendario</Text>
                    <Text style={styles.headerSubtitle}>
                        Conecta tu calendario desde otra plataforma
                    </Text>
                </View>

                <View style={styles.optionsContainer}>

                    <Pressable
                        style={styles.option}
                        onPress={() => setIosModalVisible(true)}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: "#d1faff" }]}>
                            <MaterialCommunityIcons name="apple" size={22} color="#10464d" />
                        </View>
                        <View style={styles.optionTextContainer}>
                            <Text style={styles.optionTitle}>iOS</Text>
                            <Text style={styles.optionDescription}>
                                Importar desde Apple Calendar
                            </Text>
                        </View>
                    </Pressable>

                    <Pressable
                        style={styles.option}
                        onPress={handleGoogle}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: "#fde0dd" }]}>
                            <MaterialCommunityIcons name="google" size={22} color="#10464d" />
                        </View>
                        <View style={styles.optionTextContainer}>
                            <Text style={styles.optionTitle}>Google Calendar</Text>
                            <Text style={styles.optionDescription}>
                                Sincronizar con tu cuenta de Google
                            </Text>
                        </View>
                    </Pressable>

                    <Pressable
                        style={styles.option}
                        onPress={handleICS}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: "#eae0ff" }]}>
                            <MaterialCommunityIcons name="file" size={22} color="#10464d" />
                        </View>
                        <View style={styles.optionTextContainer}>
                            <Text style={styles.optionTitle}>Archivo .ICS</Text>
                            <Text style={styles.optionDescription}>
                                Subir archivo desde tu dispositivo
                            </Text>
                        </View>
                    </Pressable>

                    <Modal
                        transparent
                        visible={iosModalVisible}
                        animationType="fade"
                        onRequestClose={() => setIosModalVisible(false)}
                    >
                        <View style={styles.modalBackground}>
                            <View style={styles.modalCard}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalHeaderText}>Importar calendario iOS</Text>
                                </View>
                                <View style={styles.modalBody}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="https://..."
                                        placeholderTextColor="#10464d"
                                        value={iosUrl}
                                        onChangeText={setIosUrl}
                                    />

                                    <View style={styles.modalButtons}>
                                        <Pressable
                                            style={styles.cancelButton}
                                            onPress={() => setIosModalVisible(false)}
                                        >
                                            <Text style={{ color: "#10464d", fontFamily: "Jost-Medium" }}>Cancelar</Text>
                                        </Pressable>
                                        <Pressable
                                            style={styles.submitButton}
                                            onPress={handleIOS}
                                        >
                                            <Text style={{ color: "#fff", fontFamily: "Jost-Medium" }}>Importar</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </Modal>

                </View>

                {loading && (
                    <Text style={styles.loadingText}>Importando...</Text>
                )}

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },

    card: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: "#ffffff",
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1.75,
        borderColor: "#10464d",
    },

    header: {
        backgroundColor: "#10464d",
        paddingVertical: 24,
        paddingHorizontal: 20,
    },

    headerTitle: {
        fontFamily: FONT_FAMILY,
        fontSize: 24,
        color: "#ffffff",
        marginBottom: 6,
    },

    headerSubtitle: {
        fontFamily: FONT_FAMILY,
        fontSize: 14,
        color: "#ffffff",
        opacity: 0.9,
    },

    optionsContainer: {
        padding: 20,
    },

    option: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fffded",
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#10464d",
        shadowColor: "#10464d",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },

    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
        borderWidth: 2,
        borderColor: "#10464d",
    },

    optionTextContainer: {
        flex: 1,
    },

    optionTitle: {
        fontFamily: FONT_FAMILY,
        fontSize: 16,
        color: "#10464d",
        marginBottom: 2,
    },

    optionDescription: {
        fontFamily: FONT_FAMILY,
        fontSize: 13,
        color: "#10464d",
        opacity: 0.6,
    },

    loadingText: {
        textAlign: "center",
        paddingBottom: 20,
        fontFamily: FONT_FAMILY,
        color: "#eb8c85",
    },
  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalCard: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 16,
    backgroundColor: "#fffded",
    overflow: "hidden",
    elevation: 5,
  },
  modalHeader: {
    backgroundColor: "#10464d",
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  modalHeaderText: {
    fontFamily: "Jost-Medium",
    fontSize: 18,
    color: "#fcfcfc",
  },
  modalBody: {
    padding: 20,
    alignItems: "center",
  },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontFamily: "Jost-Medium",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#10464d",
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#fcfcfc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#10464d",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#10464d",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
