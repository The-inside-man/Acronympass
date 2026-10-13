# Acronympass

A small mnemonic authentication prototype: assigned letters become a personal story, with a random digit and symbol woven into random positions as memory cues. Users choose a code length from 8 to 16 characters. Signup includes a recall exercise; login asks for the full code and one personal story word by its position.

Based on Jacob Brown's original 2015 prototype.

## Run locally

Requires PHP 8.1 or newer with PDO SQLite. No JavaScript build or external database is needed.

```sh
php -S 127.0.0.1:8080 router.php
```

Open http://127.0.0.1:8080. The router serves only the application files and endpoints.

Accounts are created automatically in a SQLite database outside the web root, under the operating system's temporary directory. Temporary data can be removed by the operating system. To keep accounts somewhere persistent, choose an absolute directory outside the web root:

```sh
ACRONYMPASS_DATA_DIR=/absolute/private/account-data php -S 127.0.0.1:8080 router.php
```

This replaces the obsolete hosted MySQL connection. Existing hosted accounts are not imported or modified, and the app never contacts that database.

## The flow

1. **Compose:** choose a username and a code length from **8–16 characters** (default 8). Every code has random uppercase letters, exactly one digit (`0–9`) and one symbol (`!@#$%&*?`), in uniformly random positions. Longer codes add more personal words: 8 characters means 6 words and 2 cues; 16 means 14 words and 2 cues. Changing the length or rerolling assigns a new code. Write one personal word per letter, reading the letters left to right and skipping the cues. English letters, internal apostrophes and hyphens are supported; sentence punctuation and capitalization are ignored.
2. **Picture the order:** the live preview has one slot per code character, with digit/symbol names filled in and personal words checked against their letter initials. It distinguishes the code position from the personal-word number. For `B7RI#DGE`, the scene is `Bears [seven] ride icy [hash] dragons gathering eggs`. Write only the six personal words; the bracketed cues help you remember the code's positions.
3. **Rehearse:** the full code, memory cues and story are hidden. Recall the full code and every personal word once to create the account, or return to review and edit. There is no time limit. This exercise is a learning aid, not an additional security factor.
4. **Log in:** type, paste, autofill, or optionally pick the full code. Letters are case insensitive; every character and its position must match. The server chooses among all personal-word positions, including positions beyond six for longer stories. Count personal words only, skipping cues. The public digit/symbol names are never challenge answers. Existing six-letter and fixed-suffix eight-character accounts can still log in without a data migration.

Characters and cue positions use the browser's cryptographic random source and rejection sampling to avoid modulo bias. For a chosen length `L`, there are `26^(L−2) × 10 × 8 × L × (L−1)` possible codes. The digit has `L` possible positions and the symbol has `L−1` remaining positions; either can come first. The default eight-character code therefore has about **40.3 bits**, versus **34.5 bits** with fixed suffix positions (56 times as many combinations).

Each additional bit doubles the number of possibilities. The table translates that into possible codes and illustrative brute-force times at two assumed, sustained guessing rates. These rates are comparison scenarios, not benchmarks of this application's password hashing.

| Characters | Personal words | Random code entropy | Possible codes (approximately) | Average search at 1,000 guesses/s | Average search at 1 billion guesses/s |
| --- | --- | --- | --- | --- | --- |
| 8 | 6 | 40.3 bits | 1.38 trillion (1.38 × 10¹²) | 21.9 years | 11.5 minutes |
| 10 | 8 | 50.4 bits | 1.50 quadrillion (1.50 × 10¹⁵) | 23,800 years | 8.7 days |
| 12 | 10 | 60.4 bits | 1.49 quintillion (1.49 × 10¹⁸) | 23.6 million years | 23.6 years |
| 16 | 14 | 80.0 bits | 1.24 septillion (1.24 × 10²⁴) | 19.6 trillion years | 19.6 million years |

**How the times are calculated:** for `N` equally likely codes and `R` guesses per second, an exhaustive search that never repeats a guess takes approximately `N / (2 × R)` seconds on average. Searching the entire space takes about twice as long. A lucky guess can succeed immediately; these are averages, not minimum protection periods. Years use 365.25 days. Entropy and displayed values are rounded; calculations use the generator's exact combination count rather than the rounded bit figure.

**What the rates mean:** an offline attacker tests guesses against stolen hashes, without the website's login cooldown. Their achievable rate depends on the hashing algorithm, work factor, hardware and parallel resources; slow password hashing makes each guess more expensive. See [OWASP's password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#using-work-factors). An online attacker submits guesses to the login endpoint and faces its verification cost and account cooldown; the table's rates do not model that flow. See [OWASP's login throttling guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#login-throttling).

These values assume uniform generation at the chosen length. Rerolling for a preferred code can reduce the uniformity of the final choice. This calculation covers the random code only; personal story words do not have a known uniform distribution. Length itself is not counted as secret entropy.

The full-space estimates also assume the letters remain unknown. If someone learns the complete personal story, its initials reveal the ordered letters, leaving only the digit, symbol and their positions: `80 × L × (L−1)` possibilities (4,480 for eight characters; 19,200 for sixteen). The table is therefore not a prediction of how long it takes to compromise the complete login scheme.

The server binds a question to the session, username and submitted acronym. Questions expire after five minutes and are consumed on verification. The account screen persists across reloads through a one-hour authenticated session. Logout clears that session. Five failed verifications cause a one-minute account cooldown.

Credentials travel in JSON POST bodies. The acronym and individual words are stored as salted password hashes. Stories and answers are never written to a login log or browser storage. The signup story exists in page memory during rehearsal and is cleared when signup finishes or login succeeds.

## Checks

```sh
node --test tests/concept.test.cjs
python3 tests/integration.py
```

The concept tests cover every ordered digit/symbol position pair at each supported length, rejection sampling, ordered cues, and variable-length story recall. The integration test requires `php` on PATH and creates a disposable account database and server. It checks code/story validation, all lengths 8–16, all allowed symbols, legacy accounts, incorrect character positions, extended/repeated-letter word questions, public-cue answer rejection, expired/replayed/session-bound challenges, account cooldown, login, session restoration and logout.

This version retains the acronym-and-one-word concept. Full-passphrase login, two-word challenges, scheduled rehearsal and a recall study are future experiments. Partial questions remain knowledge-based authentication: they do not provide MFA or phishing resistance, and repeated observations reveal more of the story.
