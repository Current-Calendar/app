import { StyleSheet } from 'react-native';

export const reportStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '90%',
    maxWidth: 440,
    backgroundColor: '#f7f6f2',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },

  successContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  successIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10464D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  successIcon: {
    fontSize: 30,
    color: '#fff',
    fontWeight: '700',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10464D',
  },
  successBody: {
    fontSize: 14,
    color: '#10464D',
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.75,
  },

  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16,70,77,0.15)',
    marginBottom: 4,
  },
  noticeIcon: {
    fontSize: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#10464D',
    lineHeight: 19,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10464D',
    marginBottom: 12,
  },
  reasonOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(16,70,77,0.15)',
    marginBottom: 10,
  },
  reasonOptionSelected: {
    backgroundColor: '#10464d15',
    borderColor: '#10464D',
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10464D',
  },
  descriptionInput: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    minHeight: 80,
    fontSize: 14,
    color: '#10464D',
  },
  charCount: {
    fontSize: 12,
    color: '#10464D',
    opacity: 0.4,
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#c0392b',
    marginTop: 2,
  },

  submitBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10464D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    fontWeight: '600',
    fontSize: 16,
    color: '#fff',
  },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
  },
});