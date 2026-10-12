"use strict";

const Acronympass = (() => {
  const ordinals = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth"];
  const minLength = 8;
  const maxLength = 16;
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const symbols = "!@#$%&*?";
  const digitNames = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const symbolNames = { "!": "exclamation mark", "@": "at sign", "#": "hash", "$": "dollar", "%": "percent", "&": "ampersand", "*": "star", "?": "question mark" };
  const validWord = word => /^[a-z]+(?:['-][a-z]+)*$/.test(word) && word.length <= 64;
  const normalizeWord = value => value.trim().toLowerCase().replace(/[‘’]/g, "'").replace(/^[.,!?;:"“”()\[\]{}']+|[.,!?;:"“”()\[\]{}']+$/g, "");
  const storyWords = story => story.trim() ? story.trim().split(/\s+/).map(normalizeWord) : [];
  const storyInitials = secret => secret.replace(/[^A-Z]/gi, "").toUpperCase();

  function secretSlots(secret) {
    let wordIndex = 0;
    return [...secret].map((character, index) => ({
      character, position: index + 1,
      wordIndex: /^[A-Z]$/i.test(character) ? wordIndex++ : null,
      cue: /^[0-9]$/.test(character) ? digitNames[Number(character)] : symbolNames[character] || null
    }));
  }

  function validateStory(story, acronym) {
    const words = storyWords(story);
    const initials = storyInitials(acronym);
    if (words.length !== initials.length) return { words, valid: false, message: `Your story needs ${initials.length} personal words. You have ${words.length}.` };
    for (let index = 0; index < words.length; index++) {
      if (!validWord(words[index])) return { words, valid: false, message: `Use English letters, apostrophes or hyphens for your ${ordinals[index]} word (up to 64 characters).` };
      if (words[index][0] !== initials[index].toLowerCase()) return { words, valid: false, message: `Your ${ordinals[index]} word should start with ${initials[index]}.` };
    }
    return { words, valid: true, message: `All ${initials.length} initials match. Picture the words and cues in order before you continue.` };
  }

  function randomCharacters(alphabet, length, random) {
    let result = "";
    const limit = 256 - (256 % alphabet.length);
    const bytes = new Uint8Array(16);
    while (result.length < length) {
      random.getRandomValues(bytes);
      for (const value of bytes) {
        // Reject the incomplete range so every character is equally likely.
        if (value < limit) result += alphabet[value % alphabet.length];
        if (result.length === length) break;
      }
    }
    return result;
  }

  function generateAcronym(random = globalThis.crypto) {
    return randomCharacters(letters, 6, random);
  }

  function randomIndex(limit, random) {
    const accepted = 256 - (256 % limit);
    const byte = new Uint8Array(1);
    do { random.getRandomValues(byte); } while (byte[0] >= accepted);
    return byte[0] % limit;
  }

  function generateSecret(length = minLength, random = globalThis.crypto) {
    if (!Number.isInteger(length) || length < minLength || length > maxLength) throw new RangeError("Choose a code length from 8 to 16.");
    const initials = randomCharacters(letters, length - 2, random);
    const digit = randomCharacters(digits, 1, random);
    const symbol = randomCharacters(symbols, 1, random);
    const digitPosition = randomIndex(length, random);
    // Choose uniformly among the remaining positions, allowing either character to come first.
    let symbolPosition = randomIndex(length - 1, random);
    if (symbolPosition >= digitPosition) symbolPosition++;
    let letterIndex = 0;
    return Array.from({ length }, (_, index) => index === digitPosition ? digit : index === symbolPosition ? symbol : initials[letterIndex++]).join("");
  }

  function memoryCues(secret) {
    return secretSlots(secret).filter(slot => slot.cue).map(slot => `${slot.cue} at position ${slot.position}`).join(" · ");
  }

  function matchesRehearsal(acronym, story, expectedAcronym, expectedWords) {
    const words = storyWords(story);
    return acronym.trim().toUpperCase() === expectedAcronym && words.length === expectedWords.length && words.every((word, index) => word === expectedWords[index]);
  }
  return { normalizeWord, storyWords, storyInitials, secretSlots, validWord, validateStory, generateAcronym, generateSecret, memoryCues, matchesRehearsal, ordinals, letters, digits, symbols, minLength, maxLength };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Acronympass;

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);
  const state = { acronym: "", registration: null, challenge: null, startedAt: null, busy: false };

  function status(message = "", error = false) {
    $("status").textContent = message;
    $("status").classList.toggle("error", error);
    $("status").hidden = !message;
  }

  async function request(endpoint, payload) {
    const response = await fetch(endpoint, {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Acronympass-Request": "1" },
      body: JSON.stringify(payload)
    });
    let data;
    try { data = await response.json(); }
    catch { throw new Error("We couldn’t reach your account. Please try again in a moment."); }
    if (!response.ok) throw new Error(data.message || "Something went wrong. Please try again.");
    return data;
  }

  async function busy(action) {
    if (state.busy) return;
    state.busy = true;
    const controls = [...document.querySelectorAll("button, input, textarea, select")];
    const disabled = controls.map(control => control.disabled);
    controls.forEach(control => { control.disabled = true; });
    $("account-card").setAttribute("aria-busy", "true");
    try { await action(); }
    catch (error) { status(error.message || "Please check your connection and try again.", true); }
    finally {
      controls.forEach((control, index) => { control.disabled = disabled[index]; });
      state.busy = false;
      $("account-card").removeAttribute("aria-busy");
    }
  }

  function renderAcronym() {
    $("assigned-acronym").style.setProperty("--code-columns", state.acronym.length <= 8 ? state.acronym.length : Math.ceil(state.acronym.length / 2));
    $("assigned-acronym").replaceChildren(...Acronympass.secretSlots(state.acronym).map(slot => {
      const span = document.createElement("span");
      span.textContent = slot.character;
      span.setAttribute("aria-label", `Position ${slot.position}: ${slot.cue || slot.character}`);
      if (slot.cue) span.className = "extra-character";
      return span;
    }));
    const count = Acronympass.storyInitials(state.acronym).length;
    $("secret-cues").textContent = `Cues: ${Acronympass.memoryCues(state.acronym)}. Picture them in these positions as you recall your scene.`;
    $("story-label").textContent = `Your ${count} personal story words`;
    $("story-hint").textContent = `Write ${count} words, one for each letter from left to right. Skip the filled-in cues. Punctuation and capitalization are welcome.`;
  }

  function renderStory() {
    const result = Acronympass.validateStory($("story").value, state.acronym);
    $("story-feedback").textContent = result.message;
    $("story-feedback").classList.toggle("valid", result.valid);
    $("story").removeAttribute("aria-invalid");
    $("story-words").replaceChildren(...Acronympass.secretSlots(state.acronym).map(slot => {
      const item = document.createElement("li");
      const position = document.createElement("span");
      position.className = "word-position";
      const word = slot.wordIndex === null ? null : result.words[slot.wordIndex];
      const matched = word && word[0] === slot.character.toLowerCase() && Acronympass.validWord(word);
      position.textContent = `${slot.position} · ${slot.character} · ${slot.cue ? "cue" : `word ${slot.wordIndex + 1}`}${matched ? " ✓" : ""}`;
      const value = document.createElement("span");
      value.className = "word-value";
      value.textContent = slot.cue || word || "Your word";
      item.className = slot.cue ? "cue" : word ? (matched ? "matched" : "mismatched") : "";
      item.append(position, value);
      return item;
    }));
  }

  function newAcronym() {
    state.acronym = Acronympass.generateSecret(Number($("code-length").value));
    renderAcronym();
    renderStory();
  }

  function resetChallenge() {
    state.challenge = null;
    $("challenge-form").reset();
    $("credentials-step").hidden = false;
    $("challenge-step").hidden = true;
  }

  function leaveRehearsal(restore = true) {
    if (restore && state.registration) {
      $("story").value = state.registration.story;
      renderAcronym();
      renderStory();
    }
    state.registration = null;
    $("rehearsal-form").reset();
    $("story-step").hidden = false;
    $("rehearsal-step").hidden = true;
  }

  function switchTab(tab, focus = false) {
    status();
    resetChallenge();
    leaveRehearsal();
    for (const name of ["login", "signup"]) {
      const selected = name === tab;
      $(`${name}-tab`).setAttribute("aria-selected", String(selected));
      $(`${name}-tab`).tabIndex = selected ? 0 : -1;
      $(`${name}-panel`).hidden = !selected;
    }
    if (tab === "signup" && !state.acronym) newAcronym();
    if (focus) $(`${tab}-tab`).focus();
  }

  function signedIn(username) {
    status();
    document.querySelector(".tabs").hidden = true;
    $("login-panel").hidden = true;
    $("signup-panel").hidden = true;
    $("signed-in-panel").hidden = false;
    $("signed-in-message").textContent = `Welcome back, ${username}. You’re signed in.`;
    $("login-form").reset();
    $("signup-form").reset();
    $("story-words").replaceChildren();
    $("assigned-acronym").replaceChildren();
    $("secret-cues").textContent = "";
    state.acronym = "";
    state.startedAt = null;
    resetChallenge();
    leaveRehearsal(false);
    $("signed-in-title").focus();
  }

  $("login-tab").addEventListener("click", () => switchTab("login"));
  $("signup-tab").addEventListener("click", () => switchTab("signup"));
  document.querySelector(".tabs").addEventListener("keydown", event => {
    if (state.busy || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const tab = event.key === "Home" ? "login" : event.key === "End" ? "signup" : $("login-tab").getAttribute("aria-selected") === "true" ? "signup" : "login";
    switchTab(tab, true);
  });
  $("new-letters").addEventListener("click", () => { newAcronym(); status(); });
  $("code-length").addEventListener("change", () => { newAcronym(); status(); });
  $("story").addEventListener("input", renderStory);
  $("signup-form").addEventListener("input", () => {
    if ($("status").classList.contains("error")) status();
  });

  const markLoginStarted = () => { if (state.startedAt === null) state.startedAt = performance.now(); };
  $("login-form").addEventListener("input", markLoginStarted);
  $("toggle-acronym").addEventListener("click", () => {
    const visible = $("acronym").type === "password";
    $("acronym").type = visible ? "text" : "password";
    $("toggle-acronym").textContent = visible ? "Hide" : "Show";
    $("toggle-acronym").setAttribute("aria-pressed", String(visible));
  });
  for (const letter of Acronympass.letters + Acronympass.digits + Acronympass.symbols) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = letter;
    button.setAttribute("aria-label", `Add ${letter}`);
    button.addEventListener("click", () => {
      markLoginStarted();
      if ($("acronym").value.length < Acronympass.maxLength) $("acronym").value += letter;
    });
    $("letter-grid").append(button);
  }
  $("delete-letter").addEventListener("click", () => { $("acronym").value = $("acronym").value.slice(0, -1); });
  $("clear-letters").addEventListener("click", () => { $("acronym").value = ""; });

  $("signup-form").addEventListener("submit", event => {
    event.preventDefault();
    const result = Acronympass.validateStory($("story").value, state.acronym);
    if (!result.valid) {
      status(result.message, true);
      $("story").setAttribute("aria-invalid", "true");
      $("story").focus();
      return;
    }
    state.registration = { username: $("new-username").value.trim(), acronym: state.acronym, words: result.words, story: $("story").value };
    $("recall-copy").textContent = `We’ve hidden your code and story. Type all ${state.acronym.length} characters and your ${result.words.length} personal words from memory. Skip the number and symbol cues in the written story.`;
    $("recall-story-label").textContent = `Your ${result.words.length} personal story words`;
    $("recall-acronym").minLength = state.acronym.length;
    $("recall-acronym").maxLength = state.acronym.length;
    status();
    $("story-step").hidden = true;
    $("rehearsal-step").hidden = false;
    // Hide both the input and its previews while the user practices recall.
    $("story").value = "";
    $("story-words").replaceChildren();
    $("assigned-acronym").replaceChildren();
    $("secret-cues").textContent = "";
    $("story-feedback").textContent = "";
    $("recall-acronym").focus();
  });
  $("review-story").addEventListener("click", () => { leaveRehearsal(); status(); $("story").focus(); });
  $("rehearsal-form").addEventListener("submit", event => {
    event.preventDefault();
    if (!state.registration) return;
    if (!Acronympass.matchesRehearsal($("recall-acronym").value, $("recall-story").value, state.registration.acronym, state.registration.words)) {
      status("That doesn’t quite match. Picture your scene again, or review your story before another try.", true);
      return;
    }
    void busy(async () => {
      const registration = state.registration;
      const data = await request("register.php", { username: registration.username, password: registration.acronym, phrase: registration.words });
      if (data.status !== "registered") throw new Error("We couldn’t create your account. Please try again.");
      $("signup-form").reset();
      state.acronym = "";
      leaveRehearsal(false);
      switchTab("login");
      $("username").value = registration.username;
      status("Your account is ready. Log in with your full code and one word from your story.");
    }).then(() => { if (!$("login-panel").hidden) $("acronym").focus(); });
  });

  $("login-form").addEventListener("submit", event => {
    event.preventDefault();
    markLoginStarted();
    void busy(async () => {
      const data = await request("login.php", { action: "challenge", username: $("username").value.trim(), password: $("acronym").value.trim().toUpperCase() });
      if (data.status !== "challenge" || !Number.isInteger(data.wordCount) || data.wordCount < 6 || data.wordCount > Acronympass.maxLength - 2 || !Number.isInteger(data.position) || data.position < 1 || data.position > data.wordCount || typeof data.token !== "string") throw new Error("We couldn’t start your login. Please try again.");
      state.challenge = data;
      status();
      $("credentials-step").hidden = true;
      $("challenge-step").hidden = false;
      $("challenge-title").textContent = `What’s your ${Acronympass.ordinals[data.position - 1]} word?`;
      $("challenge-prompt").textContent = `Recall personal word ${data.position} in your ${data.wordCount}-word story. Skip the number and symbol cues when counting.`;
      $("challenge-label").textContent = `Word ${data.position}`;
    }).then(() => { if (!$("challenge-step").hidden) $("challenge-word").focus(); });
  });
  $("back-to-login").addEventListener("click", () => { resetChallenge(); status(); $("acronym").focus(); });
  $("challenge-form").addEventListener("submit", event => {
    event.preventDefault();
    if (!state.challenge) return;
    void busy(async () => {
      let data;
      try { data = await request("login.php", { action: "verify", token: state.challenge.token, confirm: $("challenge-word").value, timediff: (performance.now() - state.startedAt) / 1000 }); }
      catch (error) { resetChallenge(); throw error; }
      if (data.status !== "success") { resetChallenge(); throw new Error("Those details didn’t match. Please try again."); }
      signedIn(data.username);
    }).then(() => { if (!$("credentials-step").hidden && $("signed-in-panel").hidden) $("acronym").focus(); });
  });
  $("logout").addEventListener("click", () => {
    void busy(async () => {
      await request("login.php", { action: "logout" });
      $("signed-in-panel").hidden = true;
      document.querySelector(".tabs").hidden = false;
      switchTab("login");
      status("You’re logged out. See you next time.");
    }).then(() => $("username").focus());
  });

  void busy(async () => {
    const data = await request("login.php", { action: "session" });
    if (data.status === "authenticated") signedIn(data.username);
  });
});
