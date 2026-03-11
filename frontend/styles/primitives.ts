import { StyleSheet } from 'react-native';
import { AppColors, AppRadii } from '@/styles/tokens';

export const AppShadows = StyleSheet.create({
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  brand: {
    shadowColor: AppColors.brand,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});

export const ButtonStyles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: AppRadii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primary: {
    backgroundColor: AppColors.brand,
    borderWidth: 1.5,
    borderColor: AppColors.brandDark,
  },
  secondary: {
    backgroundColor: AppColors.surface,
    borderWidth: 1.5,
    borderColor: AppColors.brand,
  },
  pill: {
    borderRadius: AppRadii.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AppColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.surface,
  },
  labelSecondary: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.brand,
  },
});

export const ChipStyles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: AppRadii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  active: {
    backgroundColor: AppColors.brand,
  },
  inactive: {
    backgroundColor: AppColors.surface,
  },
});
