import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text, Modal, ActivityIndicator } from 'react-native';


interface LogoutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}


export default function LogoutModal({ visible, onClose, onConfirm, loading = false }: LogoutModalProps) {
  return (
    
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Logout</Text>
          <Text style={styles.text}>Are you sure you want to log out?</Text>
          
          <View style={styles.buttonRow}>
            {/* El botón Cancelar ahora avisa a [username].tsx de que cierre el modal */}
            <TouchableOpacity 
              style={[styles.cancelButton, loading && styles.disabled]}
              onPress={onClose} 
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            {/* El botón Confirmar ahora avisa a [username].tsx de que borre la sesión */}
            <TouchableOpacity 
              style={[styles.confirmButton, loading && styles.disabled]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmText}>Yes, exit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  card: {
    backgroundColor: '#FFFDED',
    padding: 24,
    borderRadius: 16,
    width: '80%',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10464D',
    marginBottom: 10,
  },
  text: {
    fontSize: 15,
    color: '#4d4d4d',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbdbdb',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3a3a3a',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#B33F37', 
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
});