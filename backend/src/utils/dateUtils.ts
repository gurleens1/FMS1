/**
 * Returns the number of whole days between two dates.
 * Mirrors Power Fx: DateDiff(date1, date2, "Days")
 */
export function differenceInDays(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor(Math.abs(date1.getTime() - date2.getTime()) / msPerDay);
}
