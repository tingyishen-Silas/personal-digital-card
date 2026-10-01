import assert from 'node:assert/strict';
import test from 'node:test';
import { copyText } from '../src/clipboard.js';

test('copy uses the exact email, account number or album URL', async (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  t.after(() => Object.defineProperty(globalThis, 'navigator', original));
  const copied = [];
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { clipboard: { writeText: async (value) => copied.push(value) } },
  });
  const values = ['tingyi_shen@163.com', '278704142', 'https://example.com/#/castle/pudong-art-museum-2026/7'];
  for (const value of values) await copyText(value);
  assert.deepEqual(copied, values);
});

test('copy fallback restores focus and does not report success when denied', async (t) => {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  t.after(() => {
    Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    delete globalThis.document;
  });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
  let removed = false;
  let focused = false;
  const field = { value: '', style: {}, setAttribute() {}, select() {}, remove() { removed = true; } };
  globalThis.document = {
    activeElement: { focus() { focused = true; } },
    createElement: () => field,
    body: { appendChild() {} },
    execCommand: () => false,
  };
  await assert.rejects(copyText('278704142'), /Copy unavailable/);
  assert.equal(field.value, '278704142');
  assert.equal(removed, true);
  assert.equal(focused, true);
});
