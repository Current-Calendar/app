import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Linking from "expo-linking";
import * as WebBrowser from 'expo-web-browser';
import { Platform } from "react-native";

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL!.endsWith('/')
  ? process.env.EXPO_PUBLIC_API_URL
  : process.env.EXPO_PUBLIC_API_URL + '/';

export const downloadCalendar = async (id: string, token?: string) => {
  const url = `${BACKEND_URL}api/calendars/${id}/export`;

  try {
    if (Platform.OS === "web") {
      const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (!response.ok) throw new Error("No se pudo descargar el calendario");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `calendar-${id}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(downloadUrl);
      return;
    } else {
      const file = new File(Paths.document, `calendar-${id}.ics`);
      const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (!response.ok) throw new Error("Error descargando el calendario");

      const arrayBuffer = await response.arrayBuffer();
      await file.write(new Uint8Array(arrayBuffer));
      return file.uri;
    }
  } catch (error) {
    console.error("Error descargando calendario:", error);
    throw error;
  }
};

export const importIOSCalendar = async (calendarUrl: string, token?: string) => {
  try {
    const res = await fetch(`${BACKEND_URL}api/calendars/import-ios-calendar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ url: calendarUrl }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Error importando calendario iOS");
    }

    return await res.json();
  } catch (error) {
    console.error("Error importando calendario iOS:", error);
    throw error;
  }
};

export async function importGoogleCalendar() {
  try {
    const authUrl = `${BACKEND_URL}api/v1/google-auth`;
    const importUrl = `${BACKEND_URL}api/calendars/import-google-calendar`;

    if (Platform.OS === 'web') {
      window.location.href = authUrl;
      return;
    }

    const redirectUri = Linking.createURL('/');
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (result.type === 'success') {
      const response = await fetch(importUrl, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Error al importar calendario');

      const data = await response.json();
      console.log('Eventos importados:', data);
      return data;
    }
  } catch (error) {
    console.error('Error en importGoogleCalendar:', error);
    throw error;
  }
}

export async function importICS(userId: number) {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'text/calendar',
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const file = result.assets[0];
    const formData = new FormData();

    formData.append('file', { uri: file.uri, name: file.name, type: 'text/calendar' } as any);
    formData.append('user', userId.toString());
    formData.append('estado', 'PRIVADO');

    const response = await fetch(`${BACKEND_URL}api/calendars/import-ics`, {
      method: 'POST',
      body: formData,
      headers: {},
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error importando ICS');
    }

    const data = await response.json();
    console.log('Calendario importado:', data);
    return data;

  } catch (error) {
    console.error('Error importando calendario ICS:', error);
    throw error;
  }
}