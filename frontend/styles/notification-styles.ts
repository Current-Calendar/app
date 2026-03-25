import { StyleSheet } from 'react-native';

export const notificationsPageStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f6f2',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#888',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  markReadBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'flex-end',
  },
  markReadLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10464d',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
    fontWeight: '600',
  },
});

export const notificationItemStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,

    backgroundColor: '#fff',

    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 14,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },

    elevation: 2,
  },
  rowUnread: {
    backgroundColor: '#10464d08',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10464d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  typeIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#f7f6f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  message: {
    fontSize: 13,
    color: '#1a1a1a',
    lineHeight: 18,
  },
  actorName: {
    fontWeight: '700',
    color: '#10464d',
  },
  time: {
    fontSize: 11,
    color: '#888',
    marginTop: 3,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E8E5D8',
    borderWidth: 1,
    borderColor: '#10464d22',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10464d',
    alignSelf: 'center',
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  inviteBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBtnDecline: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#EB8C85',
  },
  inviteBtnDeclineText: {
    color: '#B33F37',
    fontWeight: '700',
    fontSize: 13,
  },
  inviteBtnAccept: {
    backgroundColor: '#10464d',
  },
  inviteBtnAcceptText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});