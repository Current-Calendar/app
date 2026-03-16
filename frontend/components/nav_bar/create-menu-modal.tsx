import React from 'react';
import { Modal, Pressable, Text, TouchableWithoutFeedback, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createMenuModalStyles } from '@/styles/ui-styles';

interface CreateMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onNewEvent: () => void;
  onNewCalendar: () => void;
  onImportCalendar?: () => void;
}

export function CreateMenuModal({ visible, onClose, onNewEvent, onNewCalendar, onImportCalendar }: CreateMenuModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={createMenuModalStyles.overlay}>
          <View style={createMenuModalStyles.container}>
            <Text style={createMenuModalStyles.title}>Create New</Text>

            <Pressable style={createMenuModalStyles.item} onPress={onNewEvent}>
              <View style={[createMenuModalStyles.iconBg, createMenuModalStyles.iconBgBrand]}>
                <Ionicons name="add" size={24} color="#fff" />
              </View>
              <Text style={createMenuModalStyles.itemText}>New Event</Text>
            </Pressable>

            <Pressable style={createMenuModalStyles.item} onPress={onNewCalendar}>
              <View style={[createMenuModalStyles.iconBg, createMenuModalStyles.iconBgSurfaceBorder]}>
                <Ionicons name="calendar-outline" size={22} color="#10464d" />
              </View>
              <Text style={createMenuModalStyles.itemText}>New Calendar</Text>
            </Pressable>

            {onImportCalendar && (
              <Pressable style={createMenuModalStyles.item} onPress={onImportCalendar}>
                <View style={[createMenuModalStyles.iconBg, createMenuModalStyles.iconBgSurfaceBorder]}>
                  <Ionicons name="download-outline" size={22} color="#10464d" />
                </View>
                <Text style={createMenuModalStyles.itemText}>Import Calendar</Text>
              </Pressable>
            )}

            <Pressable style={createMenuModalStyles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color="#888" />
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}