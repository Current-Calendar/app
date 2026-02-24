import { downloadCalendar } from "@/services/calendarService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { toPng } from "html-to-image";
import { useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";

const FONT_FAMILY = "Jost-Medium";

export default function calendarScreen() {
  const [open, setOpen] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const { id } = useLocalSearchParams<{ id: string }>();
  const calendarRef = useRef<View>(null);

  const optionAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const toggleMenu = () => {
    const isOpening = !open;

    Animated.timing(rotation, {
      toValue: open ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const animations = optionAnimations.map((anim, i) =>
      Animated.timing(anim, {
        toValue: open ? 0 : 1,
        duration: 200,
        delay: i * 50,
        useNativeDriver: true,
      })
    );
    Animated.stagger(50, isOpening ? animations : animations.reverse()).start(() => {
      if (!isOpening) setOpen(false);
    });
    if (isOpening) setOpen(true);
  };

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const exportarCalendar = async () => {
    try {
      const fileUri = await downloadCalendar(id);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        alert("Archivo guardado en: " + fileUri);
      }
    } catch (error) {
      alert("No se pudo descargar correctamente el calendario. ")
    }
  }

  const exportarPng = async () => {
    try {
      if (Platform.OS === "web") {
        const node = document.getElementById("calendar-web");
        if (!node) return;

        const dataUrl = await toPng(node);
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "calendar.png";
        link.click();

      } else {
        if (!calendarRef.current) return;

        const uri = await captureRef(calendarRef.current, {
          format: "png",
          quality: 1,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          alert("Imagen guardada en: " + uri);
        }
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo exportar el calendario como PNG");
    }
  }

  return (
    <View style={styles.container}>
      <Text>Pantalla principal</Text>

      <View
        id="calendar-web"
        ref={calendarRef}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#fffded",
          borderRadius: 8,
          padding: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
          alignSelf: "center",
        }}
      >
        <Text>Mi calendario aquí</Text>
      </View>

      {optionAnimations.map((anim, index) => {
        const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
        const opacity = anim;

        const isCalendar = index === 1;
        const text = isCalendar ? "Exportar calendario" : "Descargar como PNG";
        const onPress = isCalendar ? exportarCalendar : exportarPng;

        return (
          <Animated.View
            key={index}
            style={{
              position: "absolute",
              bottom: 100 + index * 45,
              right: 20,
              opacity,
              transform: [{ translateY }],
            }}
            pointerEvents={open ? "auto" : "none"}
          >
            <Pressable style={styles.option} onPress={onPress}>
              <Text style={styles.optionText}>{text}</Text>
            </Pressable>
          </Animated.View>
        );
      })}
      <Pressable style={styles.fab} onPress={toggleMenu}>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <MaterialCommunityIcons name="arrow-down-thick" size={28} color="white" />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#10464d",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  menu: {
    position: "absolute",
    bottom: 100,
    right: 20,
    alignItems: "flex-end",
  },
  option: {
    backgroundColor: "#fffded",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
    minWidth: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  optionText: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    color: "#10464d",
  },
});