const test = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const concept = require('../functions.js');

const story = 'Bears ride red icy dragons everywhere.';
const acronym = 'B7RR#IDE';

test('a story with repeated initials retains distinct word positions', () => {
  const result = concept.validateStory(story, acronym);
  assert.equal(result.valid, true);
  assert.equal(result.words[1], 'ride');
  assert.equal(result.words[2], 'red');
});

test('sentence punctuation, whitespace, case and curly apostrophes normalize consistently', () => {
  assert.deepEqual(concept.storyWords('  “Bears”\nRIDE red, icy dragons EVERYWHERE! '), ['bears', 'ride', 'red', 'icy', 'dragons', 'everywhere']);
  assert.equal(concept.normalizeWord('“Can’t!”'), "can't");
  assert.equal(concept.normalizeWord('“Moon-lit,”'), 'moon-lit');
});

test('missing, extra, reordered or malformed words are rejected', () => {
  for (const input of ['Bears ride red icy dragons', story + ' again', 'Bears ride red dragons icy everywhere', 'Bears ride r3d icy dragons everywhere', 'Bears ride red icy dragons everywhere123', '3Bears ride red icy dragons everywhere', 'Bears ride !!! icy dragons everywhere']) {
    assert.equal(concept.validateStory(input, acronym).valid, false, input);
  }
  assert.equal(concept.validateStory('Bears ride red icy dragons ' + 'e'.repeat(65), acronym).valid, false);
});

test('single-letter words are allowed so natural stories can use I and a', () => {
  assert.equal(concept.validateStory('I saw a bear eating oranges', 'ISABEO').valid, true);
});

test('rehearsal requires both the acronym and the complete ordered story', () => {
  const words = concept.storyWords(story);
  assert.equal(concept.matchesRehearsal('b7rr#ide', story.toUpperCase(), acronym, words), true);
  assert.equal(concept.matchesRehearsal('B7RI#DGE', story, acronym, words), false);
  for (const wrong of ['BRRIDE', 'B8RR#IDE', 'B7RR!IDE', 'BRRIDE7#']) {
    assert.equal(concept.matchesRehearsal(wrong, story, acronym, words), false, wrong);
  }
  assert.equal(concept.matchesRehearsal(acronym, 'Bears red ride icy dragons everywhere', acronym, words), false);
  assert.equal(concept.matchesRehearsal(acronym, 'Bears ride red icy dragons', acronym, words), false);
});

test('acronym generation rejects biased byte values and produces six letters', () => {
  const random = { getRandomValues(bytes) { bytes.set([234, 255, 0, 1, 2, 3, 4, 5, 233, 0, 0, 0, 0, 0, 0, 0]); } };
  assert.equal(concept.generateAcronym(random), 'ABCDEF');
  assert.match(concept.generateAcronym(webcrypto), /^[A-Z]{6}$/);
});

function scriptedRandom(values) {
  let call = 0;
  return { getRandomValues(bytes) {
    assert(call < values.length, 'Unexpected random draw');
    bytes.fill(0);
    const value = values[call++];
    if (Array.isArray(value)) bytes.set(value);
    else bytes.fill(value);
  } };
}

test('generation rejects biased character and position values', () => {
  const random = scriptedRandom([[234, 255, 0, 1, 2, 3, 4, 5], [250, 255, 7], 2, 1, 255, 3]);
  assert.equal(concept.generateSecret(8, random), 'A7BC#DEF');
});

test('every length produces exactly one digit, one symbol, and the corresponding personal words', () => {
  for (let length = 8; length <= 16; length++) {
    const secret = concept.generateSecret(length, webcrypto);
    assert.equal(secret.length, length);
    assert.match(secret, /^[A-Z0-9!@#$%&*?]+$/);
    assert.equal((secret.match(/[0-9]/g) || []).length, 1);
    assert.equal((secret.match(/[!@#$%&*?]/g) || []).length, 1);
    const words = [...concept.storyInitials(secret)].map(letter => letter.toLowerCase());
    assert.equal(words.length, length - 2);
    assert.equal(concept.validateStory(words.join(' '), secret).valid, true);
    assert.equal(concept.validateStory(words.slice(1).join(' '), secret).valid, false);
    assert.equal(concept.matchesRehearsal(secret.toLowerCase(), words.join(' '), secret, words), true);
    assert.equal(concept.matchesRehearsal(secret, words.slice(1).join(' '), secret, words), false);
  }
  for (const length of [6, 7, 17, 8.5, NaN, '12']) assert.throws(() => concept.generateSecret(length), RangeError);
});

test('every ordered digit and symbol position pair is reachable, including the boundaries', () => {
  for (let length = 8; length <= 16; length++) {
    const arrangements = new Set();
    for (let digitPosition = 0; digitPosition < length; digitPosition++) {
      for (let symbolIndex = 0; symbolIndex < length - 1; symbolIndex++) {
        const secret = concept.generateSecret(length, scriptedRandom([0, 7, 2, digitPosition, symbolIndex]));
        const symbolPosition = symbolIndex >= digitPosition ? symbolIndex + 1 : symbolIndex;
        assert.equal(secret[digitPosition], '7');
        assert.equal(secret[symbolPosition], '#');
        arrangements.add(secret);
      }
    }
    assert.equal(arrangements.size, length * (length - 1));
  }
});

test('every digit and symbol is reachable and has a spoken memory cue', () => {
  for (let digit = 0; digit < 10; digit++) {
    for (let symbol = 0; symbol < concept.symbols.length; symbol++) {
      const random = scriptedRandom([0, digit, symbol, 6, 6]);
      const secret = concept.generateSecret(8, random);
      assert.equal(secret, `AAAAAA${digit}${concept.symbols[symbol]}`);
      assert.doesNotMatch(concept.memoryCues(secret), /undefined/);
      assert.equal(concept.validateStory('A a a a a a', secret).valid, true);
    }
  }
  assert.equal(concept.memoryCues('B7RR#IDE'), 'seven at position 2 · hash at position 5');
  assert.equal(concept.memoryCues('?BRRIDE0'), 'question mark at position 1 · zero at position 8');
  assert.equal(concept.memoryCues('BRRIDE'), '');
});

test('ordered slots distinguish personal-word numbers from code positions and prefill only cues', () => {
  const slots = concept.secretSlots('B7RI#DGE');
  assert.deepEqual(slots.map(slot => slot.position), [1,2,3,4,5,6,7,8]);
  assert.deepEqual(slots.map(slot => slot.wordIndex), [0,null,1,2,null,3,4,5]);
  assert.deepEqual(slots.filter(slot => slot.cue).map(slot => slot.cue), ['seven','hash']);
  assert.equal(concept.storyInitials('B7RI#DGE'), 'BRIDGE');
  assert.equal(concept.validateStory('Bears seven ride icy hash dragons gathering eggs', 'B7RI#DGE').valid, false);
});
