// Loads the Midtrans Snap script on demand and opens the payment popup.
// The client key is public and read from NEXT_PUBLIC_* env.

const SNAP_SANDBOX = "https://app.sandbox.midtrans.com/snap/snap.js";
const SNAP_PRODUCTION = "https://app.midtrans.com/snap/snap.js";

export interface SnapCallbacks {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
}

declare global {
  interface Window {
    snap?: { pay: (token: string, callbacks: SnapCallbacks) => void };
  }
}

let loader: Promise<void> | null = null;

function loadSnap(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Snap unavailable on the server"));
  if (window.snap) return Promise.resolve();
  if (loader) return loader;

  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";
  const src = process.env.NEXT_PUBLIC_MIDTRANS_ENV === "production" ? SNAP_PRODUCTION : SNAP_SANDBOX;

  loader = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.setAttribute("data-client-key", clientKey);
    script.onload = () => resolve();
    script.onerror = () => {
      loader = null;
      reject(new Error("Failed to load Midtrans Snap"));
    };
    document.body.appendChild(script);
  });
  return loader;
}

/** Open the Midtrans Snap payment popup for a given transaction token. */
export async function payWithSnap(token: string, callbacks: SnapCallbacks): Promise<void> {
  await loadSnap();
  if (!window.snap) throw new Error("Midtrans Snap is not available");
  window.snap.pay(token, callbacks);
}
