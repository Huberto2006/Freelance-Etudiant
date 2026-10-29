/* =========================================================
   HELPERS
   ========================================================= */

export function estMemeJournee(
  a: string,
  b: string,
): boolean {
  return (
    new Date(a).toDateString() ===
    new Date(b).toDateString()
  );
}
