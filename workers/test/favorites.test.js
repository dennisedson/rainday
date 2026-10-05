import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFavorites } from '../src/hubspot.js';

test('a stored "[]" is an empty list, not a favorite called "[]"', () => {
  assert.deepEqual(parseFavorites('[]'), []);
});

test('real catalog ids come back in the order they were saved', () => {
  assert.deepEqual(
    parseFavorites('URQ64HF6M36IBMJOW7JMOJGR,W62UWFY35CWMYGVWK6TWJDNI'),
    ['URQ64HF6M36IBMJOW7JMOJGR', 'W62UWFY35CWMYGVWK6TWJDNI']
  );
});

test('junk mixed in with real ids is dropped and the real ids are kept', () => {
  assert.deepEqual(
    parseFavorites('[],URQ64HF6M36IBMJOW7JMOJGR, ,["X"]'),
    ['URQ64HF6M36IBMJOW7JMOJGR']
  );
});

test('a product saved twice appears once', () => {
  assert.deepEqual(
    parseFavorites('URQ64HF6M36IBMJOW7JMOJGR,URQ64HF6M36IBMJOW7JMOJGR'),
    ['URQ64HF6M36IBMJOW7JMOJGR']
  );
});

test('an empty or missing property is an empty list', () => {
  assert.deepEqual(parseFavorites(''), []);
  assert.deepEqual(parseFavorites(null), []);
  assert.deepEqual(parseFavorites(undefined), []);
});
