import { StyleSheet } from 'react-native';
import { AppColors, AppRadii } from '@/styles/tokens';
import { AppShadows, ButtonStyles, ChipStyles } from '@/styles/primitives';

export const calendarHeaderStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexWrap: 'wrap',
    gap: 8,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayBtn: {
    ...ButtonStyles.base,
    ...ButtonStyles.pill,
    ...ButtonStyles.secondary,
    ...AppShadows.soft,
    gap: 5,

  },
  todayLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.brand,
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0ec',
    borderRadius: 8,
    padding: 2,
  },
  viewModeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  viewModeBtnActive: {
    backgroundColor: AppColors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  viewModeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textMuted,
  },
  viewModeLabelActive: {
    color: AppColors.brand,
    fontWeight: '700',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.textPrimary,
    minWidth: 150,
    textAlign: 'center',
  },
  arrowBtn: {
    ...ButtonStyles.iconCircle,
    ...AppShadows.soft,
  },
});

export const calendarSelectorStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trigger: {
    
    ...ButtonStyles.base,
    ...ButtonStyles.pill,
    ...ButtonStyles.secondary,
    borderWidth: 1.5,
    borderRadius: 25,
    paddingVertical: 8,
    maxWidth: 200,
    ...AppShadows.soft,
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  triggerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textPrimary,
    flexShrink: 1,
  },
  infoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.surface,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...AppShadows.soft,
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
    backgroundColor: AppColors.surface,
    borderRadius: AppRadii.md,
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
    color: AppColors.textPrimary,
  },
  infoAction: {
    paddingLeft: 12,
  },
});

export const eventFilterBarStyles = StyleSheet.create({
  strip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16,70,77,0.08)',
  },
  chip: {
    ...ChipStyles.base,
  },
  chipActive: {
    ...ChipStyles.active,
    ...AppShadows.brand,
  },
  chipInactive: {
    ...ChipStyles.inactive,
    ...AppShadows.soft,
    elevation: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export const eventPillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginTop: 2,
    gap: 3,
  },
  time: {
    fontSize: 8,
    fontWeight: '700',
    opacity: 0.8,
  },
  title: {
    fontSize: 9,
    fontWeight: '600',
    flexShrink: 1,
  },
});

export const calendarCardStyles = StyleSheet.create({
  cardContainer: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1.5,
    borderColor: '#164E52',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  commentButton: {
  marginTop: 10,
  flexDirection: 'row',
  alignItems: 'center',
  alignSelf: 'flex-start',
  },

  commentText: {
    marginLeft: 6,
    color: '#10464d',
    fontWeight: '600',
    fontSize: 14,
  },
  cardImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  cardDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: 17,
    color: '#164E52',
    flexShrink: 1,
  },
  cardDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  actionsRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 16,
  marginTop: 10,
},
actionButton: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
},
actionText: {
  color: '#10464d',
  fontWeight: '600',
  fontSize: 14,
},
});

export const calendarGridStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#fff',
    marginHorizontal: 10,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  weekRow: {
    flexDirection: 'row',
    backgroundColor: '#10464d',
  },
  weekCell: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#ffffffCC',
  },
  weekLabelWeekend: {
    color: '#eb8c85',
  },
  gridBody: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  cell: {
    minHeight: 84,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E5D8',
    padding: 3,
    backgroundColor: '#fff',
  },
  cellBlank: {
    backgroundColor: '#F7F6F2',
  },
  cellToday: {
    backgroundColor: '#10464d08',
    borderColor: '#10464d40',
  },
  cellWeekend: {
    backgroundColor: '#FAFAF6',
  },
  cellSelected: {
    backgroundColor: '#10464d18',
    borderColor: '#10464d',
    borderWidth: 1.5,
  },
  dayHeader: {
    flexDirection: 'row',
    marginBottom: 1,
  },
  dayBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeToday: {
    backgroundColor: '#10464d',
  },
  dayBadgeSelected: {
    backgroundColor: '#10464d',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  dayNumberToday: {
    color: '#fff',
    fontWeight: '700',
  },
  dayNumberSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dayNumberWeekend: {
    color: '#eb8c85',
  },
  eventsContainer: {
    flexShrink: 1,
  },
  overflow: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    paddingLeft: 4,
    color: '#888',
  },
});

export const eventCalendarSwitchStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1b5b60',
    borderRadius: 25,
    alignSelf: 'center',
    marginVertical: 16,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  activeButton: {
    backgroundColor: '#ffffff',
  },
  text: {
    color: '#ffffff',
    fontWeight: '600',
  },
  activeText: {
    color: '#1b5b60',
  },
});

export const eventCalendarCalendarCardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cover: {
    width: '100%',
    height: 140,
  },
  coverFallback: {
    width: '100%',
    height: 140,
    display: 'none',
  },
  coverFallbackShown: {
    display: 'flex',
  },
  content: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  creator: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  badge: {
    marginLeft: 8,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  privacyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  originBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFDFE4',
    backgroundColor: '#F4F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  likeBtn: {
    flexDirection: 'row', 
    alignItems: 'center', 
    marginRight: 16,
    marginLeft: 8,
  },
  likeBtnIcon: {
    color: 'lightcoral'
  },
  likeBtnText: {
    fontSize: 16,
    fontWeight: '100',
    alignSelf: 'center',
    marginRight: 4,
  },
  subscribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10464d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  subscribedBtn: {
    backgroundColor: "#9E9E9E",
  },
  commentBtn: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 10,
  paddingHorizontal: 2,
  },

  commentBtnText: {
    color: "#10464d",
    fontWeight: "600",
    fontSize: 14,
  },
  btnIcon: {
    marginRight: 4,
  },
  subscribeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export const eventCalendarEventCardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#f2f2f2',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f4b6b6',
    padding: 20,
    marginBottom: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  username: {
    fontWeight: '600',
  },
  body: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 2,
  },
  imageWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  description: {
    color: '#555',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#333',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  calendarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10464d',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  calendarBadgeText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
  },
});

export const calendarInfoModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000040',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D5D5D5',
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  colorBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D2D2D',
  },
  creatorText: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 16,
  },
  coverImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#E8E5D8',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F7F6F2',
    borderRadius: 12,
    borderLeftWidth: 3,
    padding: 12,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionsCompact: {
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    rowGap: 10,
    columnGap: 8,
    marginTop: 8,
  },
  compactActionWrap: {
    width: 56,
    alignItems: 'center',
  },
  compactActionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
  },
  compactActionButtonInvite: {
    borderColor: '#10464d',
    backgroundColor: '#EAF7F6',
  },
  compactActionButtonEdit: {
    borderColor: '#10464d',
    backgroundColor: '#10464d',
  },
  compactActionButtonNeutral: {
    borderColor: '#10464d',
    backgroundColor: '#fff',
  },
  compactActionButtonDanger: {
    borderColor: '#EB8C85',
    backgroundColor: '#eb8c8514',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10464d',
    borderRadius: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginTop: 8,
  },
  editButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#EB8C85',
    backgroundColor: '#eb8c8514',
    borderRadius: 14,
    paddingVertical: 11,
    marginTop: 8,
  },
  deleteButtonDisabled: {
    opacity: 0.7,
  },
  deleteButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B33F37',
  },
  inviteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#10464d',
    backgroundColor: '#EAF7F6',
    borderRadius: 14,
    paddingVertical: 11,
    marginTop: 8,
  },
  inviteButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10464d',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#10464d',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 11,
    marginTop: 8,
  },
  shareButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10464d',
  },
});

export const eventDetailModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000040',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D5D5D5',
    alignSelf: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  accentBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginTop: 2,
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D2D2D',
  },
  description: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 14,
    marginLeft: 16,
  },
  detailsContainer: {
    gap: 10,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    fontSize: 15,
    color: '#2D2D2D',
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10464d',
    borderRadius: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  editButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#EB8C85',
    backgroundColor: '#eb8c8514',
    borderRadius: 14,
    paddingVertical: 11,
  },
  deleteButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B33F37',
  },
});

export const publicEventDetailModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000040',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D5D5D5',
    alignSelf: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  accentBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginTop: 2,
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D2D2D',
  },
  description: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 14,
    marginLeft: 16,
  },
  detailsContainer: {
    gap: 10,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    fontSize: 15,
    color: '#2D2D2D',
    flexShrink: 1,
  },
});

export const eventDetailsModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    width: '92%',
    maxWidth: 520,
    backgroundColor: '#E8E5D8',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(16,70,77,0.22)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 5,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1.5,
    borderColor: 'rgba(16,70,77,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverWrap: {
    width: '100%',
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 10,
  },
  title: {
    color: '#10464D',
    fontWeight: '900',
    fontSize: 22,
    lineHeight: 26,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowText: {
    color: '#10464D',
    fontWeight: '800',
    fontSize: 15,
    flexShrink: 1,
  },
  rowSub: {
    marginTop: -6,
    marginLeft: 26,
  },
  subText: {
    color: '#10464D',
    opacity: 0.75,
    fontWeight: '800',
    fontSize: 13,
  },
  descWrap: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16,70,77,0.14)',
    gap: 6,
  },
  descTitle: {
    color: '#10464D',
    fontWeight: '900',
    fontSize: 14,
  },
  descText: {
    color: '#10464D',
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  primaryBtn: {
    marginHorizontal: 16,
    marginBottom: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#1F6A6A',
    borderWidth: 2,
    borderColor: '#0B3D3D',
  },
  primaryBtnText: {
    color: '#EAF7F6',
    fontWeight: '900',
    fontSize: 16,
    textAlign: 'center',
  },
});
