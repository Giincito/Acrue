// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const browserSentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isLocalSentryHost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

Sentry.init({
  dsn: browserSentryDsn,
  enabled: Boolean(browserSentryDsn) && !isLocalSentryHost,

  tracesSampleRate: 0.1,
  enableLogs: true,

  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
