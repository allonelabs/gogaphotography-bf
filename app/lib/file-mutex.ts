// Per-file promise chain for read-modify-write JSONL paths shared across
// `video-projects-store` and `video-collab-store`. Two stores writing to the
// same on-disk file at once would race; this serializes ops keyed by the
// absolute path. Append-only writes (`appendFile`) take the mutex too so an
// `appendX` landing during an `updateX` read-write window doesn't get
// truncated when the updater writes back its pre-append snapshot.
import 'server-only';

const fileMutex: Map<string, Promise<void>> = new Map();

export async function withFileMutex<T>(absPath: string, op: () => Promise<T>): Promise<T> {
  const prev = fileMutex.get(absPath) ?? Promise.resolve();
  const myPromise = prev.then(() => op());
  // Never-rejecting tail so a thrown op doesn't poison the queue.
  const tail: Promise<void> = myPromise.then(() => {}, () => {});
  fileMutex.set(absPath, tail);
  try {
    return await myPromise;
  } finally {
    if (fileMutex.get(absPath) === tail) fileMutex.delete(absPath);
  }
}
