/**
 * The time now in `timeZone` (an IANA name such as Europe/Warsaw), as HH:MM, updated every few seconds. Empty
 * during server rendering, so cached pages never show a stale time, and for a zone the browser does not know.
 */
export function useLocalClock(timeZone: () => string, locale: () => string) {
  const time = ref('');
  let timer: ReturnType<typeof setInterval> | undefined;

  function tick() {
    const zone = timeZone().trim();
    if (!zone) {
      time.value = '';
      return;
    }
    try {
      time.value = new Intl.DateTimeFormat(locale() === 'fa' ? 'fa-IR' : 'en-GB', {
        timeZone: zone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date());
    } catch {
      time.value = '';
    }
  }

  onMounted(() => {
    tick();
    timer = setInterval(tick, 10_000);
  });
  onBeforeUnmount(() => clearInterval(timer));
  watch(timeZone, tick);
  return time;
}
