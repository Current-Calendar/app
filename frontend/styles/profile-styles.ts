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
    actionButtonAlt: { backgroundColor: '#10464d' },
    actionButtonTextAlt: { color: '#fff' },

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

    editHeaderGreen: {
        backgroundColor: '#10464d',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    editHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    editHeaderCoral: {
        backgroundColor: '#eb8c85',
        height: 6,
        width: '100%',
    },
    editHeaderTitle: {
        fontSize: 17,
        fontWeight: '500',
        color: '#ffffff',
    },
    editHeaderButton: {
        fontSize: 15,
        color: '#ffffff',
        opacity: 0.85,
    },
    editHeaderSaveButton: {
        color: '#fffded',
        fontWeight: '600',
        opacity: 1,
    },

    editScrollContent: {
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 40,
    },

    editProfilePictureContainer: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 3,
        borderColor: '#10464d',
        overflow: 'hidden',
        backgroundColor: '#d1faff',
        marginBottom: 10,
    },
    editPhotoSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    editChangePhotoText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#10464d',
    },

    editSectionPill: {
        backgroundColor: '#fcfcfc',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#dddcce',
        padding: 16,
        marginBottom: 16,
    },
    editFieldContainer: {
        marginBottom: 20,
    },
    editLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#10464d',
        marginBottom: 6,
    },
    editInput: {
        backgroundColor: '#fffded',
        borderWidth: 1,
        borderColor: '#dddcce',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#262626',
    },
    editBioInput: {
        minHeight: 100,
        paddingTop: 12,
    },
    editCharacterCount: {
        fontSize: 12,
        color: '#737373',
        marginTop: 4,
        textAlign: 'right',
    },

    editDangerPill: {
        backgroundColor: '#fcfcfc',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#f1d7d4',
        padding: 16,
        marginBottom: 16,
    },
    editDangerTitle: {
        fontSize: 13,
        fontWeight: '500',
        color: '#842f2a',
        marginBottom: 4,
    },
    editDangerText: {
        fontSize: 13,
        color: '#7a4f4a',
        lineHeight: 18,
        marginBottom: 14,
    },
    editDangerButton: {
        borderWidth: 1.5,
        borderColor: '#eb8c85',
        backgroundColor: '#eb8c8514',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 40,
        marginBottom: 10,
    },
    editDangerButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#B33F37',
    },
    editDangerErrorText: {
        fontSize: 13,
        color: '#B33F37',
        textAlign: 'center',
        marginBottom: 8,
    },
    editButtonDisabled: {
        opacity: 0.7,
    },
    editSaveButton: {
        backgroundColor: '#eb8c85',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        width: '100%',
        marginBottom: 16,
    },
    editSaveButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#10464d',
    },

    editModalOverlay: {
        flex: 1,
        backgroundColor: '#00000050',
        justifyContent: 'center',
        paddingHorizontal: 18,
    },
    editModalCard: {
        backgroundColor: '#fffded',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#dddcce',
        padding: 20,
        width: '80%',
        alignSelf: 'center',
    },
    editModalTitle: {
        fontSize: 17,
        fontWeight: '500',
        color: '#262626',
        marginBottom: 10,
    },
    editModalText: {
        fontSize: 14,
        color: '#4d4d4d',
        lineHeight: 20,
        marginBottom: 16,
    },
    editModalActions: {
        flexDirection: 'row',
        gap: 10,
    },
    editModalCancelButton: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: '#10464d',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    editModalCancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#10464d',
    },
    editModalConfirmButton: {
        flex: 1,
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#B33F37',
    },
    editModalConfirmButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#ffffff',
    },
    editModalDeleteButton: {
        flex: 1,
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#B33F37',
    },
    editModalDeleteButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#ffffff',
    },
});

export default profileStyles;