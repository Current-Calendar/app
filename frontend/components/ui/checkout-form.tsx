import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';

export default function CheckoutForm() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  const openPaymentSheet = async () => {
    setLoading(true);

    try {
     
      const response = await fetch('http://localhost:8000/api/v1/payments/create-payment-intent/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 1500 }), // El precio (1500 = 15.00€)
      });
      const data = await response.json();
      
      if (!data.clientSecret) throw new Error("No client secret from backend");


      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Current Calendar',
        paymentIntentClientSecret: data.clientSecret,
       
      });

      if (initError) {
        Alert.alert("Error", initError.message);
        setLoading(false);
        return;
      }

     
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        Alert.alert(`Pago cancelado`, paymentError.message);
      } else {
        Alert.alert('¡Éxito!', '¡Tu pago se ha procesado correctamente! 🎉');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo conectar con el servidor.');
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={openPaymentSheet}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Procesando...' : 'Pagar de forma segura'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  button: { backgroundColor: '#10464d', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 10, width: '100%', alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#9ca3af' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }
});