import { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Alert
} from 'react-native';
import { useReports, ReportReason } from '@/hooks/use-reports';
import { router, useLocalSearchParams } from 'expo-router';

const REASONS: { label: string; value: ReportReason }[] = [
    { label: 'Inappropriate content', value: 'INAPPROPRIATE_CONTENT' },
    { label: 'Spam', value: 'SPAM' },
    { label: 'Abusive behavior', value: 'ABUSIVE_BEHAVIOR' },
    { label: 'Other', value: 'OTHER' },
];

export default function ReportScreen() {
    const { resourceId, resourceType } = useLocalSearchParams();

    const { submitReport, loading } = useReports();

    const [reason, setReason] = useState<ReportReason | null>(null);
    const [description, setDescription] = useState('');

    const handleSubmit = async () => {
        if (!reason) return;

        const reportKey = `report_${resourceType}_${resourceId}`;

        const lastReport = localStorage.getItem(reportKey);

        if (lastReport && Date.now() - Number(lastReport) < 600000) {
            Alert.alert(
                'Report already sent',
                'You already reported this recently.'
            );
            return;
        }

        try {
            await submitReport({
                resource_type: resourceType as any,
                resource_id: Number(resourceId),
                reason,
                description,
            });

            localStorage.setItem(reportKey, Date.now().toString());

            Alert.alert(
                'Report submitted',
                'Thank you. Our team will review this report.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch {
            Alert.alert('Error', 'Could not submit report.');
        }
    };

    return (
        <View style={{ flex: 1, padding: 20, backgroundColor: '#f7f6f2' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 20 }}>
                Report content
            </Text>

            {REASONS.map(r => (
                <TouchableOpacity
                    key={r.value}
                    onPress={() => setReason(r.value)}
                    style={{
                        padding: 14,
                        borderRadius: 12,
                        marginBottom: 10,
                        backgroundColor: reason === r.value ? '#10464d15' : '#fff'
                    }}
                >
                    <Text style={{ fontSize: 14 }}>{r.label}</Text>
                </TouchableOpacity>
            ))}

            {reason === 'OTHER' && (
                <TextInput
                    placeholder="Describe the issue"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    style={{
                        marginTop: 10,
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: '#fff',
                        minHeight: 80
                    }}
                />
            )}

            <TouchableOpacity
                onPress={handleSubmit}
                disabled={!reason || loading}
                style={{
                    marginTop: 20,
                    backgroundColor: '#10464d',
                    padding: 14,
                    borderRadius: 12,
                    alignItems: 'center'
                }}
            >
                <Text style={{ color: '#fff', fontWeight: '600' }}>
                    Submit report
                </Text>
            </TouchableOpacity>
        </View>
    );
}