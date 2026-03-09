import { StyleSheet } from 'react-native';

const profileStyles = StyleSheet.create({
    container: { flex: 1 },
    centerContent: { justifyContent: 'center', alignItems: 'center' },
    scrollView: { flex: 1 },
    profileSection: { paddingHorizontal: 16, paddingTop: 16 },
    profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    profilePictureContainer: { marginRight: 28 },
    profilePicture: { width: 120, height: 120, borderRadius: 200, borderWidth: 2, borderColor: '#dbdbdb' },
    statsContainer: { flex: 1, flexDirection: 'column' },
    statsRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
    statItem: { alignItems: 'center' },
    statNumber: { fontSize: 18, fontWeight: '600', color: '#262626' },
    statLabel: { fontSize: 13, color: '#737373', marginTop: 2 },
    name: { fontSize: 18, fontWeight: '700', color: '#262626' },
    fullname: { marginTop: 12, fontSize: 12, fontWeight: '600', color: '#262626' },
    pronouns: { fontSize: 12, fontWeight: '500', color: '#6868689a', marginBottom: 10, marginTop: 4 },
    bioSection: { marginBottom: 12 },
    bio: { fontSize: 14, color: '#262626', lineHeight: 20 },
    actionButton: { backgroundColor: '#eb8c85', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', marginBottom: 16, maxWidth: 500 },
    actionButtonAlt: { backgroundColor: '#e0e0e0' },
    actionButtonText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
    actionButtonTextAlt: { color: '#262626' },
    logoutButton: { backgroundColor: '#B33F37' },
    logoutButtonText: { color: '#ffffff' },
    postsGrid: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0', alignItems: 'center' },
    gridHeaderText: { padding: 16, fontSize: 16, fontWeight: '600', color: '#262626' },
    emptyText: { marginTop: 20, color: '#737373', fontStyle: 'italic' },
    errorText: { marginTop: 10, color: '#737373', fontSize: 16 }
});

export default profileStyles;
