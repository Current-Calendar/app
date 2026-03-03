import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Linking from "expo-linking";
import * as WebBrowser from 'expo-web-browser';
import { Platform } from "react-native";

const RAW_BACKEND_URL = process.env.EXPO_PUBLIC_API_URL!;

const BACKEND_URL = RAW_BACKEND_URL.endsWith('/')
  ? RAW_BACKEND_URL
  : RAW_BACKEND_URL + '/';

const ROOT_BACKEND_URL = BACKEND_URL.replace(/api\/v1\/?$/, '');

export const downloadCalendar = async (id: string, token?: string) => {
  const url = `${ROOT_BACKEND_URL}api/calendars/${id}/export`;

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

export async function importIOSCalendar(calendarUrl: string, userId: number) {
  try {
    const response = await fetch(`${BACKEND_URL}calendars/import-ios-calendar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webcal_url: calendarUrl,
        user: userId,
        estado: 'PRIVADO',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error('Error importando calendario iOS: ' + text);
    }

    const data = await response.json();
    console.log('Calendario iOS importado:', data);
    alert(`Calendario iOS importado con ${data.count || 0} eventos`);
    return data;

  } catch (error) {
    console.error('Error en importIOSCalendar:', error);
    alert('Error importando calendario iOS: ' + error);
    throw error;
  }
}

export async function importGoogleCalendar() {
  try {
    const authUrl = `${BACKEND_URL}google-auth`;
    const importUrl = `${BACKEND_URL}calendars/import-google-calendar`;

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

      if (!response.ok) {
        const text = await response.text();
        throw new Error('Error al importar calendario: ' + text);
      }

      const data = await response.json();
      console.log('Eventos importados:', data);
      alert(`Google Calendar importado. Eventos: ${data.count || 0}`);
      return data;
    } else {
      console.log('Autenticación cancelada o fallida', result);
    }

  } catch (error) {
    console.error('Error en importGoogleCalendar:', error);
    alert('Error importando Google Calendar: ' + error);
    throw error;
  }
}

export async function importICS(userId: number) {
  try {
    if (!userId) throw new Error("UserId requerido");

    const result = await DocumentPicker.getDocumentAsync({
      type: 'text/calendar',
      copyToCacheDirectory: true,
    });
    console.log('DocumentPicker result:', result);

    if (result.canceled) {
      console.log('Usuario canceló la selección de archivo');
      return;
    }

    let fileName: string;
    let fileUri: string | undefined;
    let fileBlob: Blob | undefined;

    if (Platform.OS === 'web') {
      const asset = result.assets![0];
      fileName = asset.name || 'calendar.ics';
      fileBlob = asset.file;
      if (!fileBlob) throw new Error("No se pudo obtener el archivo ICS en web");
    } else {
      const asset = result.assets![0];
      fileUri = asset.uri;
      fileName = asset.name;
      if (!fileUri || !fileName) throw new Error("Archivo ICS requerido en móvil");
    }

    console.log('Archivo seleccionado:', { fileUri, fileName, fileBlob });


    const formData = new FormData();
    if (Platform.OS === 'web' && fileBlob) {
      formData.append('file', fileBlob, fileName);
    } else {
      formData.append('file', { uri: fileUri, name: fileName, type: 'text/calendar' } as any);
    }
    formData.append('user', String(userId));
    formData.append('estado', 'PRIVADO');
    console.log('Enviando ICS a backend:', { fileUri, fileName, url: `${ROOT_BACKEND_URL}api/calendars/import-ics` });
    const response = await fetch(`${ROOT_BACKEND_URL}api/calendars/import-ics`, {
      method: 'POST',
      body: formData,
    });

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const text = await response.text();
      throw new Error("El backend no devolvió JSON: " + text);
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error importando ICS");

    console.log('Calendario importado:', data);
    return data;

  } catch (error) {
    console.error('Error importando calendario ICS:', error);
    throw error;
  }
}