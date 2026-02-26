import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

export const downloadCalendar = async (id: string, token?: string) => {
  const url = `api/calendars/${id}/export/`

  try {
    if (Platform.OS === "web") {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("No se pudo descargar el calendario");
    }

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
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

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

export const importIOSCalendar = async (calendarUrl: string): Promise<any> => {
  const res = await fetch(`/api/calendars/import-ios-calendar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: calendarUrl }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Error importando calendario iOS");
  }
  return await res.json();
};

export const importGoogleCalendar = async (): Promise<any> => {
  try {
    const resAuth = await fetch(`/api/v1/google-auth`);

    if (!resAuth.ok) throw new Error("No se pudo iniciar la autorización de Google");
    const { url: authUrl } = await resAuth.json();

    Linking.openURL(authUrl);
    const resImport = await fetch(
      `/api/calendars/import-google-calendar`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    if (!resImport.ok) throw new Error("No se pudieron importar los eventos de Google Calendar");

    return await resImport.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const importICS = async () => {

  if (Platform.OS === "web") {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".ics,text/calendar";

      input.onchange = async (event: any) => {
        try {
          const file = event.target.files[0];
          if (!file) return resolve(null);

          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch(`/api/calendars/import-ics`, {
            method: "POST",
            body: formData,
          });

          if (!res.ok) throw new Error("Error importando ICS");
          resolve(await res.json());
        } catch (err) {
          reject(err);
        }
      };

      input.click();
    });
  } else {
    const result = await DocumentPicker.getDocumentAsync({
      type: "text/calendar",
      copyToCacheDirectory: true,
    });
    if (result.canceled) return null;

    const file = result.assets[0];
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: "text/calendar",
    } as any);

    const res = await fetch(`/api/calendars/import-ics`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Error importando ICS");
    return await res.json();
  }
};
