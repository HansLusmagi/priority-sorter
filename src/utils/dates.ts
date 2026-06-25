import {
  parseISO,
  format,
  addDays,
  differenceInDays,
  startOfDay,
  isBefore,
  isAfter,
  min as dateMin,
  max as dateMax,
} from "date-fns"

export function toDate(s: string): Date {
  return startOfDay(parseISO(s))
}

export function fmt(d: Date | string): string {
  if (typeof d === "string") d = toDate(d)
  return format(d, "yyyy-MM-dd")
}

export function dayDiff(a: string, b: string): number {
  return differenceInDays(toDate(a), toDate(b))
}

export function addDaysStr(s: string, n: number): string {
  return fmt(addDays(toDate(s), n))
}

export function todayStr(): string {
  return fmt(new Date())
}

export function minDate(a: string, b: string | null): string {
  if (!b) return a
  return fmt(isBefore(toDate(a), toDate(b)) ? a : b)
}

export function maxDate(a: string, b: string | null): string {
  if (!b) return a
  return fmt(isAfter(toDate(a), toDate(b)) ? a : b)
}

export function daysBetween(a: string, b: string): number {
  return Math.abs(dayDiff(a, b)) + 1
}

export function taskDurationDays(start: string, end: string): number {
  return Math.max(1, daysBetween(start, end))
}
