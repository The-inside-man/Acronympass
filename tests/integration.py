"""End-to-end API checks using disposable PHP sessions and account data."""
import http.cookiejar
import json
import os
from pathlib import Path
import shutil
import socket
import sqlite3
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PHP = os.environ.get('PHP_BINARY') or shutil.which('php')
assert PHP, 'PHP 8.1+ with PDO SQLite is required; put php on PATH or set PHP_BINARY.'


def client():
    jar = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar)), jar


with tempfile.TemporaryDirectory(prefix='acronympass-test-') as temp:
    data_dir = Path(temp) / 'data'
    session_dir = Path(temp) / 'sessions'
    session_dir.mkdir()
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    base = f'http://127.0.0.1:{port}'
    environment = dict(os.environ, ACRONYMPASS_DATA_DIR=str(data_dir))
    with open(Path(temp) / 'server.log', 'w+') as log:
        server = subprocess.Popen([PHP, '-d', f'session.save_path={session_dir}', '-S', f'127.0.0.1:{port}', 'router.php'], cwd=ROOT, env=environment, stdout=log, stderr=log)
        try:
            for _ in range(100):
                try:
                    urllib.request.urlopen(base, timeout=1).close()
                    break
                except (OSError, urllib.error.URLError):
                    if server.poll() is not None:
                        log.seek(0)
                        raise AssertionError(log.read())
                    time.sleep(0.05)
            else:
                raise AssertionError('PHP server did not start.')
            browser, cookies = client()

            def post(endpoint, payload, browser=browser, header=True):
                headers = {'Content-Type': 'application/json'}
                if header:
                    headers['X-Acronympass-Request'] = '1'
                request = urllib.request.Request(base + '/' + endpoint, data=json.dumps(payload).encode(), headers=headers)
                try:
                    response = browser.open(request, timeout=30)
                except urllib.error.HTTPError as error:
                    response = error
                return response.status, json.loads(response.read())

            username = 'story-tester'
            acronym = 'B7RR#IDE'
            words = ['bears', 'ride', 'red', 'icy', 'dragons', 'everywhere']
            account = dict(username=username, password=acronym, phrase=words)
            assert post('login.php', {'action': 'session'})[1]['status'] == 'anonymous'
            assert post('register.php', account, header=False)[0] == 403
            for invalid in ['BRRIDE', 'BRRIDE7', 'BRRIDE#', 'BRRIDE7+', 'BRRID77#', 'BRRIDE77#', '7#BRRID', '7#ABCDEFGHIJKLMNO', '7##BRRIDE', 'ABCDEFGH']:
                assert post('register.php', dict(account, password=invalid))[0] == 422, invalid
            assert post('register.php', dict(account, phrase=words[:-1]))[0] == 422
            assert post('register.php', dict(account, phrase=['wrong'] + words[1:]))[0] == 422
            assert post('register.php', dict(account, phrase='not-an-array'))[0] == 422
            assert post('register.php', account)[1]['status'] == 'registered'
            assert post('register.php', account)[0] == 409
            db = sqlite3.connect(data_dir / 'accounts.sqlite')
            stored = db.execute('SELECT password, phrase FROM users WHERE username = ?', (username,)).fetchone()
            assert stored[0] != acronym and len(json.loads(stored[1])) == 6
            assert all(word not in stored[1] for word in words)

            def challenge(browser=browser, password=acronym):
                code, result = post('login.php', dict(action='challenge', username=username, password=password), browser=browser)
                assert code == 200 and result['wordCount'] == 6 and 1 <= result['position'] <= 6
                return result

            def verify(question, answer, browser=browser):
                return post('login.php', dict(action='verify', token=question['token'], confirm=answer), browser=browser)

            # Correct words cannot compensate for a wrong character or its position.
            for wrong in ['B8RR#IDE', 'B7RR!IDE', 'BRRIDE', 'BRRIDE7#']:
                question = challenge(password=wrong)
                assert verify(question, words[question['position'] - 1])[0] == 401
            question = challenge(password=acronym.lower())
            assert verify(question, words[question['position'] - 1])[1]['status'] == 'success'
            assert post('login.php', {'action': 'logout'})[1]['status'] == 'logged_out'

            # All supported symbols survive signup, hashing and JSON login, including zero.
            for index, symbol in enumerate('!@#$%&*?'):
                symbol_account = dict(account, username=f'symbol-tester-{index}', password=f'0{symbol}BRRIDE')
                assert post('register.php', symbol_account)[1]['status'] == 'registered'
                code, question = post('login.php', dict(action='challenge', username=symbol_account['username'], password=symbol_account['password']))
                assert code == 200
                assert verify(question, words[question['position'] - 1])[1]['status'] == 'success'
                assert post('login.php', {'action': 'logout'})[1]['status'] == 'logged_out'

            # Previously created six-letter and fixed-suffix accounts need no migration.
            for index, legacy_code in enumerate(['BRRIDE', 'BRRIDE7#']):
                legacy_name = f'legacy-tester-{index}'
                legacy_hash = subprocess.run([PHP, '-r', 'echo password_hash($argv[1], PASSWORD_DEFAULT);', legacy_code], check=True, capture_output=True, text=True).stdout
                db.execute('INSERT INTO users (username, password, phrase) VALUES (?, ?, ?)', (legacy_name, legacy_hash, stored[1]))
                db.commit()
                code, question = post('login.php', dict(action='challenge', username=legacy_name, password=legacy_code.lower()))
                assert code == 200 and question['wordCount'] == 6
                assert verify(question, words[question['position'] - 1])[1]['status'] == 'success'
                assert post('login.php', {'action': 'logout'})[1]['status'] == 'logged_out'

            # Each supported length has one personal word per letter, never per cue.
            long_words = ['bears', 'ride', 'red', 'icy', 'dragons', 'everywhere', 'foxes', 'gather', 'happy', 'igloos', 'jump', 'kindly', 'laughing', 'moons']
            for length in range(8, 17):
                personal = long_words[:length - 2]
                initials = ''.join(word[0].upper() for word in personal)
                long_code = '#' + initials + '7'
                long_name = f'length-tester-{length}'
                long_account = dict(username=long_name, password=long_code, phrase=personal)
                assert post('register.php', dict(long_account, phrase=personal[:-1]))[0] == 422
                assert post('register.php', long_account)[1]['status'] == 'registered'
                code, question = post('login.php', dict(action='challenge', username=long_name, password=long_code.lower()))
                assert code == 200 and question['wordCount'] == length - 2
                assert 1 <= question['position'] <= len(personal)
                assert verify(question, personal[question['position'] - 1])[1]['status'] == 'success'
                assert post('login.php', {'action': 'logout'})[1]['status'] == 'logged_out'

            # Exercise the last word in the longest story, beyond the original six positions.
            for _ in range(500):
                _, question = post('login.php', dict(action='challenge', username=long_name, password=long_code))
                if question['position'] == 14:
                    break
            else:
                raise AssertionError('The last long-story word was never selected.')
            assert verify(question, 'seven')[0] == 401
            _, question = post('login.php', dict(action='challenge', username=long_name, password=long_code))
            assert verify(question, long_words[question['position'] - 1])[1]['status'] == 'success'
            assert post('login.php', {'action': 'logout'})[1]['status'] == 'logged_out'

            # Specifically exercise the two R positions; answering the other R must fail.
            for _ in range(100):
                question = challenge()
                if question['position'] in (2, 3):
                    break
            else:
                raise AssertionError('No repeated-letter position was selected.')
            other_r = words[2 if question['position'] == 2 else 1]
            assert verify(question, other_r)[0] == 401
            assert verify(question, words[question['position'] - 1])[1]['status'] == 'expired'

            question = challenge()
            stranger, _ = client()
            assert verify(question, words[question['position'] - 1], browser=stranger)[0] == 401
            assert verify(question, words[question['position'] - 1])[1]['status'] == 'success'
            assert verify(question, words[question['position'] - 1])[0] == 401
            assert post('login.php', {'action': 'session'})[1]['status'] == 'authenticated'
            assert post('login.php', {'action': 'logout'})[1]['status'] == 'logged_out'
            assert post('login.php', {'action': 'session'})[1]['status'] == 'anonymous'

            # Expire a real server-side challenge rather than waiting five minutes.
            question = challenge()
            cookie = next(c.value for c in cookies if c.name == 'acronympass_session')
            expire = 'session_id($argv[1]); session_start(); $_SESSION["challenge"]["expires_at"] = 0; session_write_close();'
            subprocess.run([PHP, '-d', f'session.save_path={session_dir}', '-r', expire, cookie], check=True, capture_output=True)
            assert verify(question, words[question['position'] - 1])[1]['status'] == 'expired'

            # Wrong acronym attempts count too; a correct answer cannot bypass cooldown.
            for _ in range(5):
                question = challenge(password='ZZZZZZ7#')
                assert verify(question, words[question['position'] - 1])[0] == 401
            question = challenge()
            assert verify(question, words[question['position'] - 1])[0] == 429
            db.execute('UPDATE users SET locked_until = ? WHERE username = ?', (int(time.time()) - 1, username))
            db.commit()
            question = challenge()
            assert verify(question, words[question['position'] - 1].upper() + '.')[1]['status'] == 'success'
            db.close()
            for path in ['/api.php', '/README.md', '/.git/config', '/tests/integration.py']:
                try:
                    urllib.request.urlopen(base + path)
                    raise AssertionError(f'{path} should not be served')
                except urllib.error.HTTPError as error:
                    assert error.code == 404
            print('PASS: shuffled code/story validation, lengths 8–16, every symbol, zero, wrong characters/positions, legacy accounts, hashed storage, extended/repeated-letter word questions, single-use/session-bound/expired challenges, cooldown, login, session, logout, router')
        finally:
            server.terminate()
            server.wait(timeout=10)
