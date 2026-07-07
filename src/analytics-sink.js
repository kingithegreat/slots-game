// HTTP analytics sink — wires src/analytics.js's setSink() to a real
// collector endpoint (Phase 6 roadmap item: "analytics backend via
// setSink"). Config is env-var gated exactly like AdMob's unit IDs (see
// src/ads.js): with no endpoint configured this module is a documented
// no-op and events keep buffering locally only, same as before this file
// existed. Set VITE_ANALYTICS_ENDPOINT before a release to point this at a
// real collector (any HTTPS endpoint that accepts `{ events: [...] }` JSON
// POSTs — e.g. a Cloud Function, a Firebase HTTPS endpoint, or a hosted
// ingestion service).
//
// Batches events and flushes on a batch-size threshold, a timer, or page
// hide, using sendBeacon where available (fire-and-forget on unload) and
// fetch otherwise. Never throws into the caller — analytics must never
// break the game (same invariant analytics.js's track() already keeps).

const BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 15_000;

// `let`, not `const`, so `_setEndpointForTests` can override it — the only
// reason this is mutable is to make the module testable under plain Node
// (no `import.meta.env` there). Production code never calls that setter;
// the real value always comes from the Vite env var at module load.
let _endpoint = import.meta.env?.VITE_ANALYTICS_ENDPOINT || '';

export function endpointConfigured() {
  return Boolean(_endpoint);
}

let queue = [];
let flushTimer = null;

/** Pure: decide whether a queued batch is big enough to flush immediately. */
export function shouldFlush(queueLength, batchSize = BATCH_SIZE) {
  return queueLength >= batchSize;
}

/** Pure: build the wire payload for a batch of buffered events. */
export function buildPayload(events) {
  return JSON.stringify({ events });
}

function send(events) {
  if (!_endpoint || events.length === 0) return;
  const payload = buildPayload(events);
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon(_endpoint, blob)) return;
    }
  } catch {
    /* fall through to fetch */
  }
  try {
    if (typeof fetch === 'function') {
      fetch(_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {
        /* best-effort — events are already persisted locally by analytics.js */
      });
    }
  } catch {
    /* analytics must never throw into the caller */
  }
}

function clearFlushTimer() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

function flush() {
  clearFlushTimer();
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];
  send(batch);
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS);
}

/** The setSink()-compatible function — every analytics.js event flows through this. */
export function httpSink(entry) {
  if (!_endpoint) return; // no collector configured — events still buffer locally via analytics.js
  queue.push(entry);
  if (shouldFlush(queue.length)) {
    flush();
  } else {
    scheduleFlush();
  }
}

/**
 * Call once at app startup (see App.jsx) to wire analytics.js -> a real
 * backend. Returns the sink function to pass to setSink(), or `null` when
 * no endpoint is configured — callers should skip setSink() in that case
 * so analytics.js keeps its existing (local-buffer + console.debug) shape.
 */
export function initAnalyticsSink() {
  if (!_endpoint) return null;
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  }
  return httpSink;
}

/** Test-only: point the module at a fake endpoint (plain Node has no import.meta.env). */
export function _setEndpointForTests(url) {
  _endpoint = url;
}

/** Test-only: reset module-level queue/timer/endpoint state between test cases. */
export function _resetForTests() {
  clearFlushTimer();
  queue = [];
  _endpoint = '';
}

/** Test-only: force-flush whatever is currently queued. */
export function _flushForTests() {
  flush();
}

/** Test-only: current queue length, without triggering a flush. */
export function _queueLengthForTests() {
  return queue.length;
}
