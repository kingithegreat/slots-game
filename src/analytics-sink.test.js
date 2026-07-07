// Plain node:test suite (no test runner is configured in this repo — see
// README > Maths model for the same node-executable convention used by
// engine/simulate.js). Run directly:
//
//   node --test src/analytics-sink.test.js
//
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldFlush,
  buildPayload,
  httpSink,
  initAnalyticsSink,
  endpointConfigured,
  _setEndpointForTests,
  _resetForTests,
  _flushForTests,
  _queueLengthForTests,
} from './analytics-sink.js';

test('shouldFlush: false below the batch size, true at/above it', () => {
  assert.equal(shouldFlush(0), false);
  assert.equal(shouldFlush(19), false);
  assert.equal(shouldFlush(20), true);
  assert.equal(shouldFlush(21), true);
  assert.equal(shouldFlush(5, 5), true);
  assert.equal(shouldFlush(4, 5), false);
});

test('buildPayload: wraps events in a stable { events } envelope', () => {
  const events = [{ event: 'spin', bet: 10 }];
  const payload = buildPayload(events);
  assert.equal(payload, JSON.stringify({ events }));
  assert.deepEqual(JSON.parse(payload), { events });
});

test('buildPayload: empty batch still serializes cleanly', () => {
  assert.equal(buildPayload([]), '{"events":[]}');
});

test('no endpoint configured (default/production-safe state): initAnalyticsSink returns null', () => {
  _resetForTests();
  assert.equal(endpointConfigured(), false);
  assert.equal(initAnalyticsSink(), null);
});

test('no endpoint configured: httpSink is a no-op and never queues', () => {
  _resetForTests();
  httpSink({ event: 'spin' });
  assert.equal(_queueLengthForTests(), 0);
});

test('endpoint configured: initAnalyticsSink returns the httpSink function', () => {
  _resetForTests();
  _setEndpointForTests('https://collector.example.com/events');
  assert.equal(endpointConfigured(), true);
  assert.equal(initAnalyticsSink(), httpSink);
  _resetForTests();
});

test('endpoint configured: httpSink queues events and flushes at the batch threshold', (t) => {
  _resetForTests();
  _setEndpointForTests('https://collector.example.com/events');

  const sent = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (url, init) => {
    sent.push({ url, body: JSON.parse(init.body) });
    return Promise.resolve({ ok: true });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    _resetForTests();
  });

  for (let i = 0; i < 19; i++) httpSink({ event: 'spin', i });
  assert.equal(_queueLengthForTests(), 19, 'below threshold: still queued, not yet sent');
  assert.equal(sent.length, 0);

  httpSink({ event: 'spin', i: 19 }); // 20th event crosses BATCH_SIZE (20)
  assert.equal(_queueLengthForTests(), 0, 'flush empties the queue');
  assert.equal(sent.length, 1, 'flush sends exactly one batch');
  assert.equal(sent[0].url, 'https://collector.example.com/events');
  assert.equal(sent[0].body.events.length, 20);
});

test('endpoint configured: sendBeacon is preferred over fetch when available', (t) => {
  _resetForTests();
  _setEndpointForTests('https://collector.example.com/events');

  const beaconCalls = [];
  const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalFetch = globalThis.fetch;
  // Node's global `navigator` is a read-only getter — redefine it for this test.
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      sendBeacon: (url, blob) => {
        beaconCalls.push({ url, blob });
        return true;
      },
    },
    configurable: true,
  });
  globalThis.fetch = () => {
    throw new Error('fetch should not be called when sendBeacon succeeds');
  };
  t.after(() => {
    if (originalNavigatorDescriptor) {
      Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor);
    }
    globalThis.fetch = originalFetch;
    _resetForTests();
  });

  for (let i = 0; i < 20; i++) httpSink({ event: 'spin', i });
  assert.equal(beaconCalls.length, 1);
  assert.equal(beaconCalls[0].url, 'https://collector.example.com/events');
});

test('endpoint configured: below-threshold events flush on demand (e.g. visibility change) without throwing', () => {
  _resetForTests();
  _setEndpointForTests('https://collector.example.com/events');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.resolve({ ok: true });

  httpSink({ event: 'spin' });
  httpSink({ event: 'win_celebration' });
  assert.equal(_queueLengthForTests(), 2);

  assert.doesNotThrow(() => _flushForTests());
  assert.equal(_queueLengthForTests(), 0);

  globalThis.fetch = originalFetch;
  _resetForTests();
});

test('a failing/unavailable network never throws out of httpSink (analytics must never break the game)', () => {
  _resetForTests();
  _setEndpointForTests('https://collector.example.com/events');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('network unavailable');
  };

  assert.doesNotThrow(() => {
    for (let i = 0; i < 20; i++) httpSink({ event: 'spin', i });
  });

  globalThis.fetch = originalFetch;
  _resetForTests();
});
