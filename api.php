<?php
// Shared helpers for the local concept prototype. Requires PHP 8.1+ and PDO SQLite.
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

set_exception_handler(function (Throwable $error): void {
    error_log('Acronympass request failed (' . get_class($error) . ').');
    respond(['status' => 'error', 'message' => 'Your account is temporarily unavailable. Please try again in a moment.'], 500);
});

ini_set('session.use_strict_mode', '1');
session_name('acronympass_session');
session_set_cookie_params([
    'httponly' => true,
    'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'samesite' => 'Strict',
    'path' => '/',
]);
session_start();

function respond(array $body, int $code = 200): never
{
    http_response_code($code);
    echo json_encode($body, JSON_THROW_ON_ERROR);
    exit;
}

function input(): array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Allow: POST');
        respond(['status' => 'error', 'message' => 'Please submit the form to continue.'], 405);
    }
    // Cross-origin forms cannot send this JSON request with a custom header.
    if (($_SERVER['HTTP_X_ACRONYMPASS_REQUEST'] ?? '') !== '1'
        || !str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
        respond(['status' => 'error', 'message' => 'Please reload the page and try again.'], 403);
    }
    $raw = file_get_contents('php://input', false, null, 0, 4097);
    if ($raw === false || strlen($raw) > 4096) {
        respond(['status' => 'error', 'message' => 'That form is too long. Please check your story and try again.'], 422);
    }
    try {
        $body = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        respond(['status' => 'error', 'message' => 'We couldn’t read that form. Please try again.'], 422);
    }
    if (!is_array($body) || array_is_list($body)) {
        respond(['status' => 'error', 'message' => 'We couldn’t read that form. Please try again.'], 422);
    }
    return $body;
}

function normalize_word(string $word): string
{
    $word = str_replace(['‘', '’'], "'", strtolower(trim($word)));
    return preg_replace('/^[.,!?;:"“”()\[\]{}\']+|[.,!?;:"“”()\[\]{}\']+$/u', '', $word);
}

function valid_word(string $word): bool
{
    return strlen($word) <= 64 && preg_match("/^[a-z]+(?:['-][a-z]+)*$/D", $word) === 1;
}

function code_letters(string $code): string
{
    return preg_replace('/[^A-Z]/', '', $code);
}

function valid_code(string $code, bool $newAccount): bool
{
    // Previously created six-letter accounts remain valid for login.
    if (!$newAccount && preg_match('/^[A-Z]{6}$/D', $code)) {
        return true;
    }
    return preg_match('/^[A-Z0-9!@#$%&*?]{8,16}$/D', $code) === 1
        && preg_match_all('/[0-9]/', $code) === 1
        && preg_match_all('/[!@#$%&*?]/', $code) === 1;
}

function credentials(array $body, bool $newAccount = false): array
{
    $username = is_string($body['username'] ?? null) ? trim($body['username']) : '';
    $acronym = is_string($body['password'] ?? null) ? strtoupper(trim($body['password'])) : '';
    if (!preg_match('/^[A-Za-z0-9_.-]{6,64}$/D', $username) || !valid_code($acronym, $newAccount)) {
        respond(['status' => 'error', 'message' => 'Use a username of 6–64 letters, numbers, dots, dashes or underscores, and an 8–16 character code with letters, exactly one digit and one symbol (! @ # $ % & * ?), in any order.'], 422);
    }
    return [$username, $acronym];
}

function database(): PDO
{
    // Account data lives outside the document root, even when using PHP's web server.
    $directory = getenv('ACRONYMPASS_DATA_DIR') ?: sys_get_temp_dir() . '/acronympass-' . substr(hash('sha256', __DIR__), 0, 12);
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('Cannot create account data directory.');
    }
    $database = new PDO('sqlite:' . $directory . '/accounts.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $database->exec('PRAGMA busy_timeout = 5000');
    $database->exec('CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        phrase TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        locked_until INTEGER NOT NULL DEFAULT 0
    )');
    return $database;
}
