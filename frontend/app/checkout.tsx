import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import CheckoutForm from '../components/ui/checkout-form';

export default function CheckoutPage() {
  const [publishableKey, setPublishableKey] = useState('');

  useEffect(() => {
    // 1. Pedimos la clave pública al backend
    // OJO: Si pruebas en móvil físico, cambia 'localhost' por tu IP local (ej: 192.168.1.X)
    fetch('http://localhost:8000/api/v1/payments/config/')
      .then(res => res.json())
      .then(data => setPublishableKey(data.publicKey))
      .catch(err => console.error("Error al pedir la clave:", err));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Finalizar Compra</Text>
      <Text style={styles.subtitle}>Estás a un paso de confirmar tu pedido</Text>

      {publishableKey ? (
        <StripeProvider publishableKey={publishableKey}>
          <CheckoutForm />
        </StripeProvider>
      ) : (
        <ActivityIndicator size="large" color="#10464d" style={{ marginTop: 20 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280', marginBottom: 30, textAlign: 'center' },
});