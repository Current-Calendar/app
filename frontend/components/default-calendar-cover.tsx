import React from "react";
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface DefaultCalendarCoverProps {
  style?: StyleProp<ViewStyle>;
  label?: string;
  iconSize?: number;
}

export function DefaultCalendarCover({
  style,
  label = "Sin imagen",
  iconSize = 34,
}: DefaultCalendarCoverProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconWrap}>
        <Ionicons name="calendar-clear-outline" size={iconSize} color="#0B3D3D" />
      </View>
      {!!label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#E7F1F1",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#C5DDDD",
  },
  iconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#D5EAEA",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: 10,
    color: "#0B3D3D",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
