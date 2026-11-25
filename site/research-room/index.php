<?php
declare(strict_types=1);

header('Cache-Control: private, no-store, max-age=0');
header('X-LiteSpeed-Cache-Control: no-cache');
header('X-Robots-Tag: noindex, nofollow, noarchive');
header('Referrer-Policy: no-referrer');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
if (empty($_SERVER['HTTPS']) || $_SERVER['HTTPS'] === 'off') {
    header('Location: https://openontograph.org/research-room/', true, 303);
    exit;
}
$private = dirname(__DIR__, 2) . '/private-research';
session_name('OGResearchSession');
ini_set('session.use_strict_mode', '1');
session_set_cookie_params(['path' => '/research-room/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
session_start();
header('Cache-Control: private, no-store, max-age=0');
$zh = ($_GET['lang'] ?? '') === 'zh-Hans';
$url = './' . ($zh ? '?lang=zh-Hans' : '');
$now = time();
$hash = trim((string) @file_get_contents($private . '/password.hash'));
$version = hash('sha256', $hash);
$allowed = $hash !== '' && isset($_SESSION['version'], $_SESSION['last'], $_SESSION['start'])
    && hash_equals($version, $_SESSION['version']) && $now - $_SESSION['last'] <= 1800 && $now - $_SESSION['start'] <= 28800;
if (!$allowed) unset($_SESSION['version'], $_SESSION['start'], $_SESSION['last']);
if (!isset($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(24));
function esc(string $s): string { return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function redirectRoom(string $url): void { header('Location: ' . $url, true, 303); exit; }

function attempt(string $directory, string $password, string $hash, int $now): ?bool {
    $db = new PDO('sqlite:' . $directory . '/limits.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $db->exec('PRAGMA busy_timeout = 5000');
    $db->exec('CREATE TABLE IF NOT EXISTS attempts (client TEXT PRIMARY KEY, count INTEGER, expires INTEGER)');
    $db->exec('BEGIN IMMEDIATE');
    $db->prepare('DELETE FROM attempts WHERE expires <= ?')->execute([$now]);
    $client = hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown', $hash);
    $get = $db->prepare('SELECT count FROM attempts WHERE client = ?');
    $get->execute([$client]);
    $limited = (int)$get->fetchColumn() >= 12;
    if (!$limited) {
        $db->prepare('INSERT INTO attempts VALUES (?,1,?) ON CONFLICT(client) DO UPDATE SET count=count+1')->execute([$client, $now+300]);
    }
    $db->exec('COMMIT');
    if ($limited) return null;
    $valid = strlen($password) <= 128 && password_verify($password, $hash);
    if ($valid) $db->prepare('DELETE FROM attempts WHERE client=?')->execute([$client]);
    return $valid;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!is_string($_POST['csrf'] ?? null) || !hash_equals($_SESSION['csrf'], $_POST['csrf'])) {
        http_response_code(403);
        $error = $zh ? '页面已过期。请重新加载。' : 'This page expired. Reload and try again.';
    } elseif (($_POST['action'] ?? '') === 'logout') {
        $_SESSION = [];
        session_destroy();
        setcookie(session_name(), '', time()-3600, '/research-room/', '', true, true);
        redirectRoom($url);
    } elseif (($_POST['action'] ?? '') === 'login' && $hash !== '') {
        try {
            $ok = attempt($private, is_string($_POST['password'] ?? null) ? $_POST['password'] : '', $hash, $now);
            if ($ok) {
                session_regenerate_id(true);
                $_SESSION = ['start'=>$now, 'last'=>$now, 'version'=>$version, 'csrf'=>bin2hex(random_bytes(24))];
                redirectRoom($url);
            }
            http_response_code($ok === null ? 429 : 401);
            $error = $ok === null ? ($zh ? '请稍后重试。' : 'Please try again later.') : ($zh ? '密码不正确。' : 'Incorrect password.');
        } catch (Throwable $e) {
            http_response_code(503);
            $error = $zh ? '登录暂时不可用。' : 'Sign-in is temporarily unavailable.';
        }
    }
}
$library = null;
if ($allowed) {
    $_SESSION['last'] = $now;
    $raw = @file_get_contents($private . '/library.json');
    $library = $raw === false ? null : json_decode($raw, true);
    if (!is_array($library)) http_response_code(503);
}
$csrf = $_SESSION['csrf'];
session_write_close();
?>
<!doctype html><html lang="<?= $zh ? 'zh-Hans' : 'en' ?>"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title><?= $zh ? '研究资料室' : 'Research room' ?> | OnToGraPh</title><link rel="stylesheet" href="./entry.css?v=1"><?php if($allowed): ?><link rel="stylesheet" href="./research.css?v=1"><?php endif; ?></head>
<body><?= $allowed ? '' : '<main class="entry">' ?>
<?php if (!$allowed): ?>
<header class="brand"><a href="<?= $zh ? '/zh/' : '/' ?>" aria-label="OnToGraPh"><b>O</b>n<b>T</b>o<b>G</b>ra<b>P</b>h</a><a href="<?= $zh ? './' : '?lang=zh-Hans' ?>" lang="<?= $zh ? 'en' : 'zh-Hans' ?>"><?= $zh ? 'English' : '简体中文' ?></a></header>
<div class="entry-grid"><section><p class="eyebrow"><?= $zh ? '限制访问' : 'Restricted access' ?></p><h1><?= $zh ? '研究资料室' : 'Research room' ?></h1><p><?= $zh ? '输入密码以浏览项目研究与分析。' : 'Enter your password to read the project research and analysis.' ?></p>
<form method="post" action="<?= esc($url) ?>"><input type="hidden" name="action" value="login"><input type="hidden" name="csrf" value="<?= esc($csrf) ?>"><label for="pw"><?= $zh ? '访问密码' : 'Access password' ?></label><input id="pw" name="password" type="password" autocomplete="current-password" maxlength="128" required><p role="alert"><?= esc($error) ?></p><button type="submit"><?= $zh ? '进入资料室' : 'Enter research room' ?> <span aria-hidden="true">↗</span></button></form></section>
<div class="motif" aria-hidden="true"><i></i><i></i><i></i><strong>O</strong></div></div></main>
<?php else: ?>
<header class="room-session"><a href="<?= $zh ? '/zh/' : '/' ?>">OnToGraPh</a><form method="post" action="<?= esc($url) ?>"><input type="hidden" name="action" value="logout"><input type="hidden" name="csrf" value="<?= esc($csrf) ?>"><button><?= $zh ? '退出 / Sign out' : 'Sign out / 退出' ?></button></form></header>
<?php if (is_array($library)): ?><main id="research-room"></main>
<script type="application/json" id="room-data"><?= json_encode($library, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) ?></script>
<script src="./research.js?v=1" defer></script><noscript><?= $zh ? '请启用 JavaScript 以浏览资料。' : 'Enable JavaScript to browse the collection.' ?></noscript>
<?php else: ?><p role="alert"><?= $zh ? '资料暂时不可用。' : 'The collection is temporarily unavailable.' ?></p><?php endif; endif; ?>
</body></html>
