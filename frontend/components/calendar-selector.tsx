import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    StyleSheet,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from '@/types/calendar';

interface CalendarSelectorProps {
    calendars: Calendar[];
    selectedId: string | null;
    onChange: (calendarId: string | null) => void;
    /** Called when the user taps the info button for a specific calendar */
    onInfoPress?: (calendar: Calendar) => void;
}

/**
 * Dropdown that lets the user pick which calendar is currently displayed.
 * Passing null means "All calendars".
 *
 * TODO BACKEND - calendars list should come from GET /calendars
 */
export function CalendarSelector({ calendars, selectedId, onChange, onInfoPress }: CalendarSelectorProps) {
    const [open, setOpen] = useState(false);

    const selected = selectedId ? calendars.find((c) => c.id === selectedId) : null;
    const displayColor = selected?.color ?? '#10464d';
    const displayName = selected?.name ?? 'All Calendars';

    // "All Calendars" pseudo-entry
    const allOption: Calendar = {
        id: '__all__',
        name: 'All Calendars',
        description: '',
        privacy: 'PUBLIC',
        origin: 'CURRENT',
        creator: '',
        color: '#10464d',
    };
    const options = [allOption, ...calendars];

    return (
        <View style={styles.row}>
            <TouchableOpacity
                style={[styles.trigger, { borderColor: displayColor }]}
                onPress={() => setOpen(true)}
                activeOpacity={0.7}
            >
                <View style={[styles.dot, { backgroundColor: displayColor }]} />
                <Text style={styles.triggerLabel} numberOfLines={1}>
                    {displayName}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#888" />
            </TouchableOpacity>

            {/* Info button — only visible when a specific calendar is selected */}
            {selected && onInfoPress && (
                <TouchableOpacity
                    style={[styles.infoBtn, { borderColor: displayColor }]}
                    onPress={() => onInfoPress(selected)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="information-circle-outline" size={18} color={displayColor} />
                </TouchableOpacity>
            )}

            <Modal
                visible={open}
                transparent
                animationType="fade"
                onRequestClose={() => setOpen(false)}
            >
                <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
                    <View style={styles.dropdown}>
                        <Text style={styles.dropdownTitle}>Select Calendar</Text>
                        <FlatList
                            data={options}
                            keyExtractor={(c) => c.id}
                            renderItem={({ item }) => {
                                const isActive =
                                    (item.id === '__all__' && selectedId === null) || item.id === selectedId;
                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.option,
                                            isActive && { backgroundColor: item.color + '18' },
                                        ]}
                                        onPress={() => {
                                            onChange(item.id === '__all__' ? null : item.id);
                                            setOpen(false);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.dot, { backgroundColor: item.color }]} />
                                        <Text
                                            style={[
                                                styles.optionLabel,
                                                isActive && { fontWeight: '700', color: item.color },
                                                { flex: 1 },
                                            ]}
                                        >
                                            {item.name}
                                        </Text>

                                        {isActive && (
                                            <Ionicons
                                                name="checkmark"
                                                size={16}
                                                color={item.color}
                                            />
                                        )}

                                        {item.id !== '__all__' && onInfoPress && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setOpen(false);
                                                    onInfoPress(item);
                                                }}
                                                hitSlop={10}
                                                style={{ paddingLeft: 12 }}
                                            >
                                                <Ionicons name="information-circle-outline" size={20} color={item.color} />
                                            </TouchableOpacity>
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderRadius: 25,
        paddingHorizontal: 14,
        paddingVertical: 8,
        maxWidth: 200,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    triggerLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2D2D2D',
        flexShrink: 1,
    },
    infoBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    overlay: {
        flex: 1,
        backgroundColor: '#00000040',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    dropdown: {
        width: 280,
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    dropdownTitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: '#888',
        marginHorizontal: 16,
        marginBottom: 4,
        marginTop: 4,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        marginHorizontal: 4,
    },
    optionLabel: {
        fontSize: 15,
        color: '#2D2D2D',
    },
});
