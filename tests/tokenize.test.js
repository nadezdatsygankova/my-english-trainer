import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeText } from '../src/utils/tokenize.js';

test('tokenizes words with accented characters', () => {
  const text = "café naïve déjà vu";
  const tokens = tokenizeText(text);
  const words = tokens.filter((t) => t.type === 'word').map((t) => t.raw);
  assert.deepEqual(words, ['café', 'naïve', 'déjà', 'vu']);
});

test('preserves spaces and punctuation around accented words', () => {
  const text = "¡Hola, señor!";
  const tokens = tokenizeText(text);
  const types = tokens.map((t) => t.type);
  assert.deepEqual(types, ['punct', 'word', 'punct', 'space', 'word', 'punct']);
});

