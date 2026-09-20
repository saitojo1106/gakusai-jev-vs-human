export interface KeyEventLike {
  readonly key: string;
  preventDefault(): void;
}

interface BrowserGlobals {
  addEventListener(type: 'keydown', listener: (event: KeyEventLike) => void): void;
  removeEventListener(type: 'keydown', listener: (event: KeyEventLike) => void): void;
  readonly location: { href: string };
  readonly sessionStorage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
  };
}

export const browser = globalThis as unknown as BrowserGlobals;

export const goTo = (url: string): void => {
  browser.location.href = url;
};

export const readSession = <T>(key: string, fallback: T): T => {
  try {
    const raw = browser.sessionStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

export const writeSession = (key: string, value: unknown): void => {
  try {
    browser.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
};
