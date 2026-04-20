import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';

const NAMESPACE = 'opticv-ai';
const VERSION = 1;

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function dateReviver(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && ISO_RE.test(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d;
  }
  return value;
}

export function fullKey(shortKey: string): string {
  return `${NAMESPACE}:v${VERSION}:${shortKey}`;
}

export function usePersistedState<T>(
  shortKey: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const key = fullKey(shortKey);
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return initial;
      return JSON.parse(raw, dateReviver) as T;
    } catch {
      return initial;
    }
  });

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* quota or privacy mode — silently ignore */
    }
  }, [key, state]);

  return [state, setState];
}

export function clearPersistedState(): void {
  try {
    const prefix = `${NAMESPACE}:v${VERSION}:`;
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefix)) window.localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}

export function readPersistedRaw<T>(shortKey: string): T | null {
  try {
    const raw = window.localStorage.getItem(fullKey(shortKey));
    if (raw == null) return null;
    return JSON.parse(raw, dateReviver) as T;
  } catch {
    return null;
  }
}
