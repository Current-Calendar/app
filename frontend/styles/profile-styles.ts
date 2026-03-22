import { StyleSheet } from 'react-native';

const profileStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fffded' },
    centerContent: { justifyContent: 'center', alignItems: 'center' },
    scrollView: { flex: 1 },

    profileHeaderGreen: {
        backgroundColor: '#10464d',
        height: 60,
        width: '100%',
    },
    profileHeaderCoral: {
        backgroundColor: '#eb8c85',
        height: 28,
        width: '100%',
    },

    profileSection: {
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: 24,
        paddingBottom: 24,
        alignItems: 'center',
    },

    profilePictureContainer: {
        marginTop: -52,
        marginBottom: 10,
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 3,
        borderColor: '#10464d',
        overflow: 'hidden',
        backgroundColor: '#d1faff',
    },
    profilePicture: {
        width: '100%',
        height: '100%',
    },

    name: {
        textAlign: 'center',
        fontSize: 17,
        fontWeight: '500',
        color: '#262626',
    },
    pronouns: {
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '500',
        color: '#737373',
        marginTop: 2,
        marginBottom: 6,
    },

    bioSection: { marginBottom: 14, maxWidth: 400, width: '100%' },
    bio: {
        textAlign: 'center',
        fontSize: 13,
        color: '#444444',
        lineHeight: 20,
    },

    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    statItem: {
        paddingVertical: 7,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: '#fcfcfc',
        borderWidth: 1.5,
        borderColor: '#10464d',
        alignItems: 'center',
    },
    statItemLast: {},
    statNumber: { fontSize: 15, fontWeight: '500', color: '#10464d' },
    statLabel: { fontSize: 10, color: '#737373', marginTop: 1 },

    buttonsRow: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
        maxWidth: 400,
        marginBottom: 8,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#eb8c85',
        paddingVertical: 9,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#10464d',
    },
    actionButtonAlt: { backgroundColor: '#e0e0e0' },
    actionButtonTextAlt: { color: '#262626' },

    logoutButton: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#10464d',
    },
    logoutButtonText: {
        color: '#10464d',
        fontWeight: '600',
        fontSize: 14,
    },

    // Separador entre botones y calendarios
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: '#dddcce',
        marginTop: 8,
    },

    // Wrapper externo de las dos columnas
    calendarsWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
        paddingHorizontal: 12,
        paddingVertical: 20,
        alignItems: 'flex-start',
        gap: 12,
    },

    // Cada columna
    calendarSection: {
        flex: 1,
        minWidth: 300,
    },

    // Pill que envuelve el header + lista de cada sección
    calendarSectionPill: {
        backgroundColor: '#fcfcfc',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#dddcce',
        overflow: 'hidden',
        paddingHorizontal: 12,
        paddingBottom: 12,
    },

    gridHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderBottomWidth: 0.5,
        borderBottomColor: '#dddcce',
        marginBottom: 10,
    },
    gridHeaderText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#262626',
    },
    gridHeaderCount: {
        fontSize: 12,
        color: '#737373',
    },

    emptyText: {
        marginTop: 8,
        color: '#737373',
        fontStyle: 'italic',
        fontSize: 13,
        paddingHorizontal: 4,
    },
    errorText: {
        marginTop: 10,
        color: '#737373',
        fontSize: 16,
        textAlign: 'center',
    },

    profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    statsRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
    fullname: { marginTop: 12, fontSize: 12, fontWeight: '600', color: '#262626' },
    postsGrid: { width: '100%', alignSelf: 'center', paddingBottom: 24, alignItems: 'center' },
});

export default profileStyles;