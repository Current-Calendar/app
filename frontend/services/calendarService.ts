import { File, Paths } from "expo-file-system";

export const downloadCalendar = async (id: string, token?: string) => {
    const url = `api/calendars/${id}/export/`

  const file = new File(Paths.document, `calendar-${id}.ics`);

  try {
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) throw new Error("Error descargando el calendario");

    const arrayBuffer = await response.arrayBuffer();

    await file.write(new Uint8Array(arrayBuffer));

    return file.uri;
  } catch (error) {
    console.error("Error descargando calendario:", error);
    throw error;
  }
};