<?php
// Run with: php -S 127.0.0.1:8080 router.php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (in_array($path, ['/', '/index.html', '/style.css', '/functions.js', '/login.php', '/register.php'], true)) {
    return false;
}
http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo 'Not found';
