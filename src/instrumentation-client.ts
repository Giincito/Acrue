// Browser Sentry is opt-in to avoid noisy 403 ingest calls when the public DSN is missing,
// disabled, or points to a project that does not accept client events.

const browserSentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isBrowserSentryOptedIn = process.env.NEXT_PUBLIC_BROWSER_SENTRY_ENABLED === "true";
const isLocalSentryHost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
const isBrowserSentryEnabled = Boolean(browserSentryDsn) && isBrowserSentryOptedIn && !isLocalSentryHost;

let browserSentryPromise: Promise<typeof import("@sentry/nextjs")> | null = null;

function loadBrowserSentry() {
  if (!isBrowserSentryEnabled) return null;

  browserSentryPromise ??= import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: browserSentryDsn,
      enabled: true,
      tracesSampleRate: 0.1,
      enableLogs: false,
      sendDefaultPii: false,
    });

    return Sentry;
  });

  return browserSentryPromise;
}

void loadBrowserSentry();

export function onRouterTransitionStart(...args: unknown[]) {
  const sentry = loadBrowserSentry();
  if (!sentry) return;

  void sentry.then((Sentry) => {
    const captureRouterTransitionStart = Sentry.captureRouterTransitionStart as (...transitionArgs: unknown[]) => void;
    captureRouterTransitionStart(...args);
  });
}
