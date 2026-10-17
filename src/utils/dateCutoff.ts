/**
 * Computes the logical "Day ID" based on user's cutoff hour (e.g. 2:00 AM).
 * Any time before cutoff hour belongs to the previous calendar day.
 */
export function getLogicalDateKey(cutoffHour: number = 2, now: Date = new Date()): string {
  const d = new Date(now.getTime());
  if (d.getHours() < cutoffHour) {
    // Treat as previous calendar day
    d.setDate(d.getDate() - 1);
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
