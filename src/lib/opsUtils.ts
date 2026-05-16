import { 
  differenceInDays, 
  addDays, 
  format, 
  isSameDay, 
  startOfDay,
  differenceInWeeks
} from 'date-fns';

// Reference date for shift cycles (Assume Jan 1, 2024 was A-Shift)
const SHIFT_REF_DATE = new Date(2024, 0, 1);
const SHIFT_ORDER = ['A', 'B', 'C', 'D'];

// Reference payday (Assume Jan 5, 2024 was a payday - Friday)
const PAYDAY_REF_DATE = new Date(2024, 0, 5);

export function getShiftForDate(date: Date): string {
  const diff = differenceInDays(startOfDay(date), startOfDay(SHIFT_REF_DATE));
  const index = ((diff % 4) + 4) % 4; // Ensure positive index
  return SHIFT_ORDER[index];
}

export function isPayday(date: Date): boolean {
  const dayOfWeek = date.getDay();
  if (dayOfWeek !== 5) return false; // Must be Friday
  
  const diffWeeks = differenceInWeeks(startOfDay(date), startOfDay(PAYDAY_REF_DATE));
  return diffWeeks % 2 === 0;
}

export function getUpcomingShifts(startDate: Date, count: number = 5) {
  const shifts = [];
  for (let i = 0; i < count; i++) {
    const d = addDays(startDate, i);
    shifts.push({
      date: d,
      shift: getShiftForDate(d),
      isPayday: isPayday(d)
    });
  }
  return shifts;
}
