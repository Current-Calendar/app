import { CalendarEvent } from '@/types/calendar';

export interface Holiday extends CalendarEvent {
  isHoliday: true;
  // Inherited required fields always set to these defaults:
  //   description: ''   (required by CalendarEvent, empty for holidays)
  //   place_name: ''    (required by CalendarEvent, empty for holidays)
  //   calendarId: 'holidays'  (sentinel — never matches a real backend numeric ID)
}

const HOLIDAY_COLOR = '#E53935';

/** Returns [month (1-based), day] of Easter Sunday for a given year. */
function easterDate(year: number): [number, number] {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return [month, day];
}

/**
 * Returns Spanish national holidays for the given years.
 * Today: pure TypeScript calculation (no backend).
 * Future: replace internals with apiClient.get('/api/holidays/?year=...')
 * and keep the Holiday[] return type unchanged.
 *
 * @param years - Array of years to include (e.g. [2026, 2027])
 */
export function useHolidays(years: number[]): Holiday[] {
  const holidays: Holiday[] = [];

  for (const year of years) {
    const [easterMonth, easterDay] = easterDate(year);
    // Viernes Santo = Easter Sunday - 2 days
    const easter = new Date(year, easterMonth - 1, easterDay);
    const viernesSanto = new Date(easter);
    viernesSanto.setDate(easter.getDate() - 2);

    const fixed: [string, number, number][] = [
      ['Año Nuevo',                    1,  1],
      ['Epifanía del Señor',           1,  6],
      ['Día del Trabajo',              5,  1],
      ['Asunción de la Virgen',        8, 15],
      ['Fiesta Nacional de España',   10, 12],
      ['Todos los Santos',            11,  1],
      ['Día de la Constitución',      12,  6],
      ['Inmaculada Concepción',       12,  8],
      ['Navidad',                     12, 25],
    ];

    const toDateStr = (d: Date): string =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Fixed holidays
    for (const [name, month, day] of fixed) {
      const date = toDateStr(new Date(year, month - 1, day));
      holidays.push({
        id: `holiday-${date}`,
        calendarId: 'holidays',
        title: name,
        date,
        time: '00:00',
        description: '',
        place_name: '',
        photo: undefined,
        recurrence: undefined,
        type: 'holiday',
        color: HOLIDAY_COLOR,
        isHoliday: true,
      });
    }

    // Viernes Santo (variable)
    const viernesSantoDate = toDateStr(viernesSanto);
    holidays.push({
      id: `holiday-${viernesSantoDate}`,
      calendarId: 'holidays',
      title: 'Viernes Santo',
      date: viernesSantoDate,
      time: '00:00',
      description: '',
      place_name: '',
      photo: undefined,
      recurrence: undefined,
      type: 'holiday',
      color: HOLIDAY_COLOR,
      isHoliday: true,
    });
  }

  // Remove duplicates (e.g. same year requested twice)
  const seen = new Set<string>();
  return holidays.filter((h) => {
    if (seen.has(h.id)) return false;
    seen.add(h.id);
    return true;
  });
}
