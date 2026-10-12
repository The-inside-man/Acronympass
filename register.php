<?php
declare(strict_types=1);
require __DIR__ . '/api.php';

$body = input();
[$username, $acronym] = credentials($body, true);
$words = $body['phrase'] ?? null;
$initials = code_letters($acronym);
$wordCount = strlen($initials);
if (!is_array($words) || !array_is_list($words) || count($words) !== $wordCount) {
    respond(['status' => 'error', 'message' => "Your story needs exactly $wordCount personal words, one per letter. Skip the number and symbol cues."], 422);
}
foreach ($words as $position => $word) {
    if (!is_string($word) || strlen($word) > 128) {
        respond(['status' => 'error', 'message' => 'Please check your personal story words.'], 422);
    }
    $words[$position] = normalize_word($word);
    if (!valid_word($words[$position]) || strtoupper($words[$position][0]) !== $initials[$position]) {
        respond(['status' => 'error', 'message' => 'Each story word must start with its assigned letter, in order.'], 422);
    }
}

$database = database();
$exists = $database->prepare('SELECT 1 FROM users WHERE username = ?');
$exists->execute([$username]);
if ($exists->fetchColumn()) {
    respond(['status' => 'exists', 'message' => 'That username is taken. Review your story to choose another username.'], 409);
}
$passwordHash = password_hash($acronym, PASSWORD_DEFAULT);
$wordHashes = array_map(fn(string $word): string => password_hash($word, PASSWORD_DEFAULT), $words);
try {
    $insert = $database->prepare('INSERT INTO users (username, password, phrase) VALUES (?, ?, ?)');
    $insert->execute([$username, $passwordHash, json_encode($wordHashes, JSON_THROW_ON_ERROR)]);
} catch (PDOException $error) {
    if ($error->getCode() === '23000') {
        respond(['status' => 'exists', 'message' => 'That username is taken. Review your story to choose another username.'], 409);
    }
    throw $error;
}
unset($_SESSION['challenge']);
respond(['status' => 'registered']);
