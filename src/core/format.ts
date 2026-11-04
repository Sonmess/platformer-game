/** 83450 → "1:23.4" (minutes:seconds.tenths). Truncates, so the shown time is never rounded up. */
export function formatTime (ms: number): string
{
    const tenths = Math.floor(Math.max(0, ms) / 100);
    const minutes = Math.floor(tenths / 600);
    const seconds = Math.floor(tenths / 10) % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths % 10}`;
}
