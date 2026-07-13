<?php
/**
 * Minimal contact-form handler for standard Apache/PHP shared hosting
 * (Hostinger, GoDaddy, etc.). No frameworks, no Composer, no external services -
 * uses PHP's built-in mail(). Replaces Webflow's hosted form backend, which the
 * exported form relied on and which is not reachable once the site is self-hosted.
 *
 * Recipients: the two contact addresses already published in the site footer.
 * Update RECIPIENTS below if those addresses ever change.
 */

$recipients = [
    'jose.garduno@pozosparaiso.com',
    'enrique.murcio@pozosparaiso.com',
];

function isAjax(): bool
{
    return isset($_SERVER['HTTP_X_REQUESTED_WITH'])
        && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
}

function respond(bool $success, string $referer): void
{
    if (isAjax()) {
        http_response_code($success ? 200 : 422);
        header('Content-Type: text/plain; charset=utf-8');
        echo $success ? 'OK' : 'ERROR';
        exit;
    }

    $base = $referer !== '' ? strtok($referer, '?') : 'contacto.html';
    header('Location: ' . $base . '?form=' . ($success ? 'success' : 'error'));
    exit;
}

// Strip anything that could be used for email header injection via a form field.
function cleanField(string $value): string
{
    $value = str_replace(["\r", "\n"], '', $value);
    return trim($value);
}

$referer = $_SERVER['HTTP_REFERER'] ?? '';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, $referer);
}

// Honeypot: real visitors never fill this hidden field in; bots often do.
if (!empty($_POST['company'])) {
    respond(true, $referer); // pretend success, send nothing
}

$name = cleanField($_POST['name'] ?? '');
$email = cleanField($_POST['email'] ?? '');
$message = trim($_POST['field'] ?? '');

if ($name === '' || $email === '' || $message === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, $referer);
}

$subject = 'Nuevo mensaje de contacto - Pozos Paraiso';
$body = "Nombre: {$name}\n" .
        "Email: {$email}\n\n" .
        "Mensaje:\n{$message}\n";

$headers = [
    'From: web@' . ($_SERVER['SERVER_NAME'] ?? 'pozosparaiso.com'),
    'Reply-To: ' . $email,
    'Content-Type: text/plain; charset=utf-8',
];

$sent = @mail(implode(',', $recipients), $subject, $body, implode("\r\n", $headers));

respond($sent, $referer);
