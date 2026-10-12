<?php
declare(strict_types=1);
require __DIR__ . '/api.php';

$body = input();
$action = $body['action'] ?? '';

if ($action === 'session') {
    if (isset($_SESSION['username'], $_SESSION['authenticated_at']) && $_SESSION['authenticated_at'] + 3600 > time()) {
        respond(['status' => 'authenticated', 'username' => $_SESSION['username']]);
    }
    unset($_SESSION['username'], $_SESSION['authenticated_at']);
    respond(['status' => 'anonymous']);
}

if ($action === 'logout') {
    $_SESSION = [];
    session_regenerate_id(true);
    respond(['status' => 'logged_out']);
}

if ($action === 'challenge') {
    [$username, $acronym] = credentials($body);
    $token = bin2hex(random_bytes(32));
    $wordCount = strlen(code_letters($acronym));
    $position = random_int(0, $wordCount - 1);
    // Issue the same kind of challenge for every username. Check all secrets together.
    $_SESSION['challenge'] = [
        'username' => $username, 'acronym' => $acronym, 'position' => $position,
        'token' => $token, 'expires_at' => time() + 300,
    ];
    respond(['status' => 'challenge', 'position' => $position + 1, 'wordCount' => $wordCount, 'token' => $token]);
}

if ($action !== 'verify') {
    respond(['status' => 'error', 'message' => 'Please start with your username and code.'], 422);
}

$challenge = $_SESSION['challenge'] ?? null;
// Every verification consumes its challenge, including unsuccessful attempts.
unset($_SESSION['challenge']);
$token = $body['token'] ?? null;
$answer = $body['confirm'] ?? null;
if (!$challenge || !is_string($token) || !hash_equals($challenge['token'], $token) || $challenge['expires_at'] <= time()) {
    respond(['status' => 'expired', 'message' => 'Please enter your code again to get a new word question.'], 401);
}
if (!is_string($answer) || strlen($answer) > 128) {
    respond(['status' => 'failed', 'message' => 'Those details didn’t match. Please try again.'], 401);
}

$database = database();
$reset = $database->prepare('UPDATE users SET attempts = 0, locked_until = 0 WHERE username = ? AND locked_until > 0 AND locked_until <= ?');
$reset->execute([$challenge['username'], time()]);
$find = $database->prepare('SELECT * FROM users WHERE username = ?');
$find->execute([$challenge['username']]);
$user = $find->fetch(PDO::FETCH_ASSOC);
if ($user && (int) $user['locked_until'] > time()) {
    respond(['status' => 'max', 'message' => 'Please wait a minute before trying again.'], 429);
}
$wordHashes = $user ? json_decode($user['phrase'], true, 16, JSON_THROW_ON_ERROR) : [];
$acronymMatches = $user && password_verify($challenge['acronym'], $user['password']);
$wordMatches = isset($wordHashes[$challenge['position']]) && password_verify(normalize_word($answer), $wordHashes[$challenge['position']]);
if (!$acronymMatches || !$wordMatches) {
    if ($user) {
        $failed = $database->prepare('UPDATE users SET attempts = attempts + 1, locked_until = CASE WHEN attempts + 1 >= 5 THEN ? ELSE 0 END WHERE username = ?');
        $failed->execute([time() + 60, $user['username']]);
    }
    respond(['status' => 'failed', 'message' => 'Those details didn’t match. Check your username, code and story, then try again.'], 401);
}

$reset = $database->prepare('UPDATE users SET attempts = 0, locked_until = 0 WHERE username = ?');
$reset->execute([$user['username']]);
session_regenerate_id(true);
$_SESSION = ['username' => $user['username'], 'authenticated_at' => time()];
respond(['status' => 'success', 'username' => $user['username']]);
