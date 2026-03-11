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

      const text = await response.text();
      const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
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

      const arrayBuffer = await response.arrayBuffer();
      await file.write(new Uint8Array(arrayBuffer));
      return file.uri;
    }
  } catch (error) {
    console.error("Error downloading calendar:", error);
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
        privacy: 'PRIVATE',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error('Error importing iOS calendar: ' + text);
    }

    const data = await response.json();
    console.log('iOS calendar imported:', data);
    alert(`iOS calendar imported with ${data.count || 0} events`);
    return data;

  } catch (error) {
    console.error('Error in importIOSCalendar:', error);
    alert('Error importing iOS calendar: ' + error);
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
        throw new Error('Error importing calendar: ' + text);
      }

      const data = await response.json();
      console.log('Events imported:', data);
      alert(`Google Calendar imported. Events: ${data.count || 0}`);
      return data;
    } else {
      console.log('Authentication cancelled or failed', result);
    }

  } catch (error) {
    console.error('Error in importGoogleCalendar:', error);
    alert('Error importing Google Calendar: ' + error);
    throw error;
  }
}

export async function importICS(userId: number) {
  try {
    if (!userId) throw new Error("UserId is required");

    const result = await DocumentPicker.getDocumentAsync({
      type: 'text/calendar',
      copyToCacheDirectory: true,
    });
    console.log('DocumentPicker result:', result);

    if (result.canceled) {
      console.log('User cancelled file selection');
      return;
    }

    let fileName: string;
    let fileUri: string | undefined;
    let fileBlob: Blob | undefined;

    if (Platform.OS === 'web') {
      const asset = result.assets![0];
      fileName = asset.name || 'calendar.ics';
      fileBlob = asset.file;
      if (!fileBlob) throw new Error("Could not get the ICS file on web");
    } else {
      const asset = result.assets![0];
      fileUri = asset.uri;
      fileName = asset.name;
      if (!fileUri || !fileName) throw new Error("ICS file is required on mobile");
    }

    console.log('File selected:', { fileUri, fileName, fileBlob });


    const formData = new FormData();
    if (Platform.OS === 'web' && fileBlob) {
      formData.append('file', fileBlob, fileName);
    } else {
      formData.append('file', { uri: fileUri, name: fileName, type: 'text/calendar' } as any);
    }
    formData.append('user', String(userId));
    formData.append('privacy', 'PRIVATE');
    console.log('Sending ICS to backend:', { fileUri, fileName, url: `${ROOT_BACKEND_URL}api/calendars/import-ics` });
    const response = await fetch(`${ROOT_BACKEND_URL}api/calendars/import-ics`, {
      method: 'POST',
      body: formData,
    });

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const text = await response.text();
      throw new Error("Backend did not return JSON: " + text);
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error importing ICS");

    console.log('Calendar imported:', data);
    return data;

  } catch (error) {
    console.error('Error importing ICS calendar:', error);
    throw error;
  }
}