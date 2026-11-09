export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * Number of ISO-8601 weeks in a year: 53 when 1 January is a Thursday, or a
 * Wednesday in a leap year; otherwise 52. (The previous check on 28 December
 * was wrong for 57 of the 76 selectable years, e.g. 2025 and 2026.)
 */
export function isoWeeksInYear(year: number): number {
  const jan1 = new Date(year, 0, 1).getDay() // 0 = Sunday … 4 = Thursday
  return jan1 === 4 || (jan1 === 3 && isLeapYear(year)) ? 53 : 52
}

/** Monday–Friday days in the year. Public holidays are not deducted. */
export function weekdaysInYear(year: number): number {
  let count = 0
  for (
    const d = new Date(year, 0, 1);
    d.getFullYear() === year;
    d.setDate(d.getDate() + 1)
  ) {
    const day = d.getDay()
    if (day !== 0 && day !== 6) count++
  }
  return count
}
