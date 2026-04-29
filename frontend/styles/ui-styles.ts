import { StyleSheet } from 'react-native';

export const themedTextStyles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});

export const uiCollapsibleStyles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
});

export const navTopBarStyles = StyleSheet.create({
  topBar: {
    height: 60,
    backgroundColor: '#10464d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidePlaceholder: {
    width: 35,
  },
  profileContainer: {
    width: 35,
    height: 35,
    borderRadius: 18,
    overflow: 'hidden',
  },
  profileAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ccc',
    borderRadius: 18,
  },
  logo: {
    width: 40,
    height: 40,
  },
});

export const navSideBarStyles = StyleSheet.create({
  sidebar: {
    width: 80,
    backgroundColor: '#10464d',
    paddingVertical: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: 250,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 15,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#888',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 15,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10464d',
  },
  sidebarTop: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  sidebarLogo: {
    width: 50,
    height: 50,
  },
  sidebarCenter: {
    flex: 1,
    justifyContent: 'center',
    gap: 30,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  closeBtn: {
    marginTop: 10,
    padding: 10,
  },
  iconBgBrand: {
    backgroundColor: '#10464d',
  },
  iconBgSurfaceBorder: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#10464d',
  },
});

export const navBottomBarStyles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 60,
    backgroundColor: '#10464d',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: 35,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: 250,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 15,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#888',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 15,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBgBrand: {
    backgroundColor: '#10464d',
  },
  iconBgSurfaceBorder: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#10464d',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10464d',
  },
  closeBtn: {
    marginTop: 10,
    padding: 10,
  },
});

export const bottomSheetModalStyles = StyleSheet.create({
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
});

export const createMenuModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: 250,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 15,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#888',
    marginBottom: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 15,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBgBrand: {
    backgroundColor: '#10464d',
  },
  iconBgSurfaceBorder: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#10464d',
  },
  itemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10464d',
  },
  closeBtn: {
    marginTop: 10,
    padding: 10,
  },
});

export const parallaxScrollViewStyles = StyleSheet.create({
  header: {
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: 'hidden',
  },
});

export const mapComponentNativeStyles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
  defaultMarker: {
    width: 40,
    height: 40,
  },
  starMarker: {
    width: 32,
    height: 32,
  },
});

export const mapComponentWebStyles = {
  fullScreenMap: { height: '100vh', width: '100%' } as const,
};
