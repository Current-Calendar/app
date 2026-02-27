import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';

interface Styles {
  container: ViewStyle;
  topHeader: ViewStyle;
  scrollContent: ViewStyle;
  profileContainer: ViewStyle;
  profileMainRow: ViewStyle;
  avatar: ImageStyle;
  badge: ViewStyle;
  userInfo: ViewStyle;
  userName: TextStyle;
  pronouns: TextStyle;
  bio: TextStyle;
  followButtonContainer: ViewStyle;
  followButton: ViewStyle;
  followButtonActive: ViewStyle;
  followButtonText: TextStyle;
  followButtonTextActive: TextStyle;
  followersText: TextStyle;
  sectionHeader: ViewStyle;
  sectionTitle: TextStyle;
  miniTabRow: ViewStyle;
  miniTabText: TextStyle;
  miniTabActive: TextStyle;
  miniTabSeparator: TextStyle;
  feedContainer: ViewStyle;
  emptyText: TextStyle;
  errorText: TextStyle;
  bottomNav: ViewStyle;
}

export const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F0',
  },
  topHeader: {
    backgroundColor: '#164E52',
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 120,
  },
  profileContainer: {
    marginBottom: 10,
  },
  profileMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFD1DC',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#A0D842',
    borderRadius: 12,
    padding: 4,
  },
  userInfo: {
    flex: 1,
    paddingHorizontal: 15,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B8C42F',
  },
  pronouns: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  bio: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  followButtonContainer: {
    alignItems: 'flex-end',
    marginTop: -25,
    marginBottom: 10,
  },
  followButton: {
    backgroundColor: '#F29B93',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  followButtonActive: {
    backgroundColor: '#E0E0E0',
  },
  followButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  followButtonTextActive: {
    color: '#666',
  },
  followersText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#164E52',
  },
  miniTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniTabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  miniTabActive: {
    color: '#164E52',
    textDecorationLine: 'underline',
  },
  miniTabSeparator: {
    marginHorizontal: 8,
    color: '#ccc',
  },
  feedContainer: {
    marginTop: 5,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#bbb',
    fontStyle: 'italic',
  },
  errorText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 25,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: '#164E52',
    width: '90%',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 35,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
});