import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const TEXT = "#10464d";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

type MiniMonthCalendarProps = {
  value: Date;
  onChange: (d: Date) => void;
  size?: number;
};

export default function MiniMonthCalendar({
  value,
  onChange,
  size = 280,
}: MiniMonthCalendarProps) {
  const selected = startOfDay(value);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  useEffect(() => {
    setViewYear(selected.getFullYear());
    setViewMonth(selected.getMonth());
  }, [value]);

  const today = useMemo(() => startOfDay(new Date()), []);

  const days = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const firstDowMondayBased = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: { date: Date | null; label: string }[] = [];

    for (let i = 0; i < firstDowMondayBased; i++) {
      cells.push({ date: null, label: "" });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(viewYear, viewMonth, d), label: String(d) });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ date: null, label: "" });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const rows = Math.max(1, Math.ceil(days.length / 7));
  const cellGapY = 6;
  const innerPad = 12;
  const headerH = 36;
  const weekdaysH = 22;
  const gridPadTop = 8;

  const gridAvailableH =
    size - innerPad * 2 - headerH - weekdaysH - gridPadTop + (rows === 6 ? 8 : 0);

  const cellH = Math.floor((gridAvailableH - cellGapY * rows) / rows);
  const cellW = Math.floor((size - innerPad * 2) / 7);

  return (
    <View style={[styles.card, { width: size }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={goPrevMonth} style={styles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={16} color={TEXT} />
        </Pressable>

        <Text style={styles.monthText}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>

        <Pressable onPress={goNextMonth} style={styles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-forward" size={16} color={TEXT} />
        </Pressable>
      </View>

      <View style={styles.weekdaysRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={`${w}-${i}`} style={[styles.weekday, { width: cellW }]}>
            {w}
          </Text>
        ))}
      </View>

      <View style={[styles.grid, { paddingTop: gridPadTop }]}>
        {days.map((cell, idx) => {
          const d = cell.date;
          const selectedCell = d ? isSameDay(d, selected) : false;
          const todayCell = d ? isSameDay(d, today) : false;

          return (
            <Pressable
              key={idx}
              disabled={!d}
              onPress={() => d && onChange(startOfDay(d))}
              style={[
                styles.dayCell,
                { width: cellW, height: cellH },
                selectedCell && styles.daySelected,
                todayCell && styles.dayToday,
                !d && styles.dayEmpty,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  selectedCell && styles.dayTextSelected,
                  !d && styles.dayTextEmpty,
                ]}
              >
                {cell.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
  },
  headerRow: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f5f5",
    borderWidth: 1,
    borderColor: "#d8e6e7",
  },
  monthText: {
    color: TEXT,
    fontWeight: "700",
    fontSize: 14,
  },
  weekdaysRow: {
    height: 22,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  weekday: {
    textAlign: "center",
    color: TEXT,
    fontWeight: "700",
    fontSize: 11,
    opacity: 0.75,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    marginBottom: 6,
  },
  dayEmpty: {
    backgroundColor: "transparent",
  },
  dayText: {
    color: TEXT,
    fontWeight: "600",
    fontSize: 12,
  },
  dayTextEmpty: {
    opacity: 0,
  },
  daySelected: {
    borderColor: TEXT,
    borderWidth: 1.5,
    backgroundColor: "#e8f2f2",
  },
  dayTextSelected: {
    fontWeight: "700",
  },
  dayToday: {
    backgroundColor: "#f0f5f5",
  },
});