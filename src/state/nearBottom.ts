// Morning's scroll view tells the news feed when you're close to the end, so
// it can show more stories, and fetch older ones once it runs out.
type Listener = () => void;
const listeners = new Set<Listener>();
let last = 0;

export function onNearBottom(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Called on scroll; ignores repeats within a second so one fling loads one page. */
export function nearBottom() {
  const now = Date.now();
  if (now - last < 1000) return;
  last = now;
  listeners.forEach((l) => l());
}
