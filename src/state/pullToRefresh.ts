// Morning's pull-to-refresh, heard by every block on the screen that loads
// something (weather, news) without lifting their state into the screen.
type Listener = () => Promise<unknown> | void;
const listeners = new Set<Listener>();

export function onPullToRefresh(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Runs every listener; resolves when they've all finished. */
export function pullToRefresh(): Promise<unknown> {
  return Promise.allSettled([...listeners].map((l) => l()));
}
