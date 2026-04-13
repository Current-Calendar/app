import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from '@/types/calendar';
import { AppColors } from '@/styles/tokens';
import { calendarSelectorStyles } from '@/styles/calendar-styles';

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
    const displayColor = selected?.color ?? AppColors.brand;
    const displayName = selected?.name ?? 'All Calendars';

    // "All Calendars" pseudo-entry
    const allOption: Calendar = {
        id: '__all__',
        name: 'All Calendars',
        description: '',
        privacy: 'PUBLIC',
        origin: 'CURRENT',
        creator: '',
        color: AppColors.brand,
        likes_count: 0,
        liked_by_me: false,
    };
    const options = [allOption, ...calendars];

    return (
        <View style={calendarSelectorStyles.row}>
            <TouchableOpacity
                style={[calendarSelectorStyles.trigger, { borderColor: displayColor }]}
                onPress={() => setOpen(true)}
                activeOpacity={0.7}
                testID="calendar-selector-trigger"
            >
                <View style={[calendarSelectorStyles.dot, { backgroundColor: displayColor }]} />
                <Text style={calendarSelectorStyles.triggerLabel} numberOfLines={1}>
                    {displayName}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#888" />
            </TouchableOpacity>

            {/* Info button â€” only visible when a specific calendar is selected */}
            {selected && onInfoPress && (
                <TouchableOpacity
                    style={[calendarSelectorStyles.infoBtn, { borderColor: displayColor }]}
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
                <Pressable style={calendarSelectorStyles.overlay} onPress={() => setOpen(false)}>
                    <View style={calendarSelectorStyles.dropdown}>
                        <Text style={calendarSelectorStyles.dropdownTitle}>Select Calendar</Text>
                        <FlatList
                            data={options}
                            keyExtractor={(c) => c.id}
                            renderItem={({ item }) => {
                                const isActive =
                                    (item.id === '__all__' && selectedId === null) || item.id === selectedId;
                                return (
                                    <TouchableOpacity
                                        style={[
                                            calendarSelectorStyles.option,
                                            isActive && { backgroundColor: item.color + '18' },
                                        ]}
                                        onPress={() => {
                                            onChange(item.id === '__all__' ? null : item.id);
                                            setOpen(false);
                                        }}
                                        activeOpacity={0.7}
                                        testID={`calendar-selector-option-${item.id}`}
                                    >
                                        <View style={[calendarSelectorStyles.dot, { backgroundColor: item.color }]} />
                                        <Text
                                            style={[
                                                calendarSelectorStyles.optionLabel,
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
                                                style={calendarSelectorStyles.infoAction}
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
