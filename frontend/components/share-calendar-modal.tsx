import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    Share,
    Platform,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from '@/types/calendar';
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { API_CONFIG } from '@/constants/api';

interface ShareCalendarModalProps {
    calendar: Calendar | null;
    onClose: () => void;
}

export function ShareCalendarModal({ calendar, onClose }: ShareCalendarModalProps) {
    const [copied, setCopied] = useState(false);

    if (!calendar) return null;

    const shareBaseUrl = process.env.EXPO_PUBLIC_SHARE_BASE_URL ?? API_CONFIG.rootBaseURL;
    const shareUrl = `${shareBaseUrl}/share/calendar/${calendar.id}/`;

    const handleNativeShare = async () => {
        try {
            await Share.share({
                message: `Check out "${calendar.name}" on Current Calendar: ${shareUrl}`,
                url: shareUrl,
                title: calendar.name,
            });
        } catch {
            // user cancelled
        }
    };

    const handleCopyLink = async () => {
        if (Platform.OS === 'web') {
            try {
                await navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch {
                // fallback: do nothing
            }
        } else {
            try {
                await Share.share({ message: shareUrl });
            } catch {
                // user cancelled
            }
        }
    };

    return (
        <BottomSheetModal visible={!!calendar} onClose={onClose}>
            {calendar.cover ? (
                <Image
                    source={{ uri: calendar.cover }}
                    style={styles.cover}
                    resizeMode="cover"
                />
            ) : (
                <View style={styles.coverPlaceholder}>
                    <Ionicons name="calendar-outline" size={48} color="#fff" />
                </View>
            )}

            <View style={styles.info}>
                <Text style={styles.name}>{calendar.name}</Text>
                <Text style={styles.creator}>by @{calendar.creator}</Text>
                {calendar.description ? (
                    <Text style={styles.description} numberOfLines={2}>
                        {calendar.description}
                    </Text>
                ) : null}
                <View style={styles.domainRow}>
                    <Ionicons name="link-outline" size={13} color="#888" />
                    <Text style={styles.domain}>current-calendar.app</Text>
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleNativeShare} activeOpacity={0.8}>
                    <Ionicons name="share-social-outline" size={18} color="#fff" />
                    <Text style={styles.primaryBtnLabel}>Share with</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleCopyLink} activeOpacity={0.8}>
                    <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color="#10464d" />
                    <Text style={styles.secondaryBtnLabel}>{copied ? 'Copied!' : 'Copy link'}</Text>
                </TouchableOpacity>
            </View>
        </BottomSheetModal>
    );
}

const styles = StyleSheet.create({
    cover: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        marginBottom: 16,
        backgroundColor: '#E8E5D8',
    },
    coverPlaceholder: {
        width: '100%',
        height: 140,
        borderRadius: 12,
        marginBottom: 16,
        backgroundColor: '#10464d',
        alignItems: 'center',
        justifyContent: 'center',
    },
    info: {
        marginBottom: 20,
        gap: 4,
    },
    name: {
        fontSize: 20,
        fontWeight: '800',
        color: '#2D2D2D',
    },
    creator: {
        fontSize: 13,
        color: '#888',
    },
    description: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
        marginTop: 4,
    },
    domainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
    },
    domain: {
        fontSize: 12,
        color: '#888',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    primaryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#10464d',
        borderRadius: 14,
        paddingVertical: 13,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    primaryBtnLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    secondaryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1.5,
        borderColor: '#10464d',
        borderRadius: 14,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    secondaryBtnLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#10464d',
    },
});
