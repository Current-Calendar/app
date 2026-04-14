import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

const TEXT = "#10464d";
const WHITE = "#ffffff";

const ITEM_H = 36;
const VISIBLE_ITEMS = 4;

const pad2 = (n: number) => String(n).padStart(2, "0");

type Props = {
  visibleNative: boolean;
  visibleWeb: boolean;
  time: Date;
  webHour: number;
  webMinute: number;
  setWebHour: React.Dispatch<React.SetStateAction<number>>;
  setWebMinute: React.Dispatch<React.SetStateAction<number>>;
  onChangeNative: (_event: any, selected?: Date) => void;
  onCloseNative: () => void;
  onCloseWeb: () => void;
  onApplyWeb: () => void;
};

export default function EventTimePickerModal({
  visibleNative,
  visibleWeb,
  time,
  webHour,
  webMinute,
  setWebHour,
  setWebMinute,
  onChangeNative,
  onCloseNative,
  onCloseWeb,
  onApplyWeb,
}: Props) {
  return (
    <>
      {visibleNative && (
        <>
          {Platform.OS === "ios" ? (
            <Modal transparent animationType="fade">
              <View style={styles.pickerOverlay}>
                <View style={styles.pickerCard}>
                  <Text style={styles.pickerTitle}>Select time</Text>

                  <DateTimePicker
                    value={time}
                    mode="time"
                    display="spinner"
                    onChange={onChangeNative}
                  />

                  <Pressable style={styles.pickerDone} onPress={onCloseNative}>
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={time}
              mode="time"
              display="spinner"
              onChange={onChangeNative}
            />
          )}
        </>
      )}

      {visibleWeb && (
        <Modal transparent animationType="fade">
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerCard}>
              <Text style={styles.pickerTitle}>Select time</Text>

              <View style={styles.webTimeRow}>
                <View style={styles.webListBox}>
                  <FlatList
                    data={Array.from({ length: 24 }, (_, i) => i)}
                    keyExtractor={(i) => `h-${i}`}
                    style={styles.webList}
                    contentContainerStyle={styles.webListContent}
                    showsVerticalScrollIndicator
                    renderItem={({ item }) => {
                      const selectedH = item === webHour;

                      return (
                        <Pressable
                          onPress={() => setWebHour(item)}
                          style={[
                            styles.webListItem,
                            selectedH && styles.webListItemSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.webListItemText,
                              selectedH && styles.webListItemTextSelected,
                            ]}
                          >
                            {pad2(item)}
                          </Text>
                        </Pressable>
                      );
                    }}
                  />
                </View>

                <View style={styles.webListBox}>
                  <FlatList
                    data={Array.from({ length: 60 }, (_, i) => i)}
                    keyExtractor={(i) => `m-${i}`}
                    style={styles.webList}
                    contentContainerStyle={styles.webListContent}
                    showsVerticalScrollIndicator
                    renderItem={({ item }) => {
                      const selectedM = item === webMinute;

                      return (
                        <Pressable
                          onPress={() => setWebMinute(item)}
                          style={[
                            styles.webListItem,
                            selectedM && styles.webListItemSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.webListItemText,
                              selectedM && styles.webListItemTextSelected,
                            ]}
                          >
                            {pad2(item)}
                          </Text>
                        </Pressable>
                      );
                    }}
                  />
                </View>
              </View>

              <View style={styles.webTimeActions}>
                <Pressable style={styles.webCancelBtn} onPress={onCloseWeb}>
                  <Text style={styles.webCancelText}>Cancel</Text>
                </Pressable>

                <Pressable style={styles.pickerDone} onPress={onApplyWeb}>
                  <Text style={styles.pickerDoneText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  pickerCard: {
    width: "92%",
    maxWidth: 440,
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 14,
  },
  pickerTitle: {
    color: TEXT,
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 10,
  },
  pickerDone: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#f0f5f5",
    alignSelf: "flex-end",
  },
  pickerDoneText: {
    color: TEXT,
    fontWeight: "700",
  },
  webTimeRow: {
    flexDirection: "row",
    gap: 12,
  },
  webListBox: {
    flex: 1,
    height: ITEM_H * VISIBLE_ITEMS + 20,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 14,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  webList: {
    flex: 1,
  },
  webListContent: {
    paddingVertical: 10,
  },
  webListItem: {
    height: ITEM_H,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  webListItemSelected: {
    backgroundColor: "#e8f2f2",
    borderWidth: 1.5,
    borderColor: TEXT,
  },
  webListItemText: {
    color: TEXT,
    fontWeight: "600",
  },
  webListItemTextSelected: {
    fontWeight: "700",
  },
  webTimeActions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  webCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#f4f4f4",
  },
  webCancelText: {
    color: TEXT,
    fontWeight: "700",
  },
});