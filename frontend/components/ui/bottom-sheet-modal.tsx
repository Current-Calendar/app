import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { bottomSheetModalStyles } from '@/styles/ui-styles';

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheetModal({ visible, onClose, children }: BottomSheetModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={bottomSheetModalStyles.overlay} onPress={onClose}>
        <Pressable style={bottomSheetModalStyles.sheet} onPress={() => { }}>
          <View style={bottomSheetModalStyles.handleBar} />
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
