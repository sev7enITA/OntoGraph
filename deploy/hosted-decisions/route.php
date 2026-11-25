<?php
// Included by the existing Studio gateway after it loads its private upstream configuration.
declare(strict_types=1);
function decisionError(int $status, string $message): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error'=>$message]);
    exit;
}
$prefix = '/OntoGraph/decisions/';
$route = substr(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), strlen($prefix));
$api = str_starts_with($route, 'api/');
$method = $_SERVER['REQUEST_METHOD'];
$session = $_COOKIE['ontograph_session'] ?? '';
if (is_string($session) && preg_match('/^[a-zA-Z0-9_-]{20,150}$/D', $session)) {
    $check = curl_init($config['origin'].'/OntoGraph/api/auth/session');
    curl_setopt_array($check, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>false,
        CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,
        CURLOPT_CONNECTTIMEOUT=>5,CURLOPT_TIMEOUT=>10,CURLOPT_HTTPHEADER=>[
            'X-DG-Gateway: '.$config['gateway_secret'], 'Cookie: ontograph_session='.$session
        ]]);
    $body = curl_exec($check);
    $status = (int)curl_getinfo($check,CURLINFO_RESPONSE_CODE);
    curl_close($check);
    if ($status === 200 && $body !== false) $identity = json_decode($body,true);
    elseif ($status !== 401 && $status !== 403) decisionError(503,'Studio authentication temporarily unavailable.');
}
$user = $identity['user'] ?? null;
if (!is_array($user) || empty($user['id'])) {
    if ($api) decisionError(401,'Sign in to Studio.');
    header('Location: /OntoGraph/login'.(($_GET['lang'] ?? '')==='zh-Hans'?'?lang=zh-Hans':''),true,303);
    exit;
}
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
if (!$api) {
    if (!in_array($method,['GET','HEAD'],true)) decisionError(405,'Unsupported method.');
    $files = [''=>['index.html','text/html'],'decisions.js'=>['decisions.js','text/javascript'],
              'assertions.js'=>['ontograph/web/assertions.js','text/javascript'],'style.css'=>['style.css','text/css']];
    if (!isset($files[$route])) decisionError(404,'Unknown resource.');
    [$file,$mime] = $files[$route];
    header('Content-Type: '.$mime.'; charset=utf-8');
    if ($method === 'GET') readfile(__DIR__.'/'.$file);
    exit;
}
$operation = substr($route,4);
if (!in_array($operation,['bootstrap','save','basis','impact','validate'],true)) decisionError(404,'Unknown operation.');
$workspace = $_GET['workspace'] ?? 'wbs';
if (!is_string($workspace) || !preg_match('/^[a-z][a-z0-9_-]{0,63}$/D',$workspace)) decisionError(400,'Invalid workspace ID.');
$editable = in_array($user['role'] ?? '', ['admin','editor','reviewer'],true);
$payload = [];
if ($operation === 'bootstrap') {
    if ($method !== 'GET') decisionError(405,'Use GET.');
} else {
    if ($method !== 'POST') decisionError(405,'Use POST.');
    $csrf = $identity['csrfToken'] ?? '';
    if (!is_string($csrf) || $csrf === '' || !hash_equals($csrf, $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '') ||
        ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') decisionError(403,'Invalid request token.');
    if ($operation === 'save' && !$editable) decisionError(403,'A Studio editor or reviewer role is required.');
    if (strtolower(explode(';',$_SERVER['CONTENT_TYPE'] ?? '')[0])!=='application/json') decisionError(415,'Expected JSON.');
    $raw=file_get_contents('php://input',false,null,0,5*1024*1024+1);
    if ($raw === false || strlen($raw)>5*1024*1024) decisionError(413,'Request too large.');
    $payload=json_decode($raw);
    if (!is_object($payload)) decisionError(400,'Invalid JSON.');
}
$input = tmpfile();
$output = tmpfile();
if (!$input || !$output) decisionError(503,'Temporary storage unavailable.');
fwrite($input,json_encode(['operation'=>$operation,'user'=>(string)$user['id'],'workspace'=>$workspace,'payload'=>$payload],JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION));
rewind($input);
$proc = proc_open(['/opt/alt/python311/bin/python3.11','-I',__DIR__.'/service.py'],
                  [0=>$input,1=>$output,2=>['file','/dev/null','a']], $pipes);
if (!is_resource($proc) || proc_close($proc)!==0) decisionError(503,'Decision engine unavailable.');
rewind($output);
$response = json_decode(stream_get_contents($output));
if (!is_array($response) || count($response)!==2) decisionError(503,'Invalid decision engine response.');
[$status,$result]=$response;
if ($operation==='bootstrap' && $status===200) {
    $result->csrf=$identity['csrfToken']; $result->editable=$editable;
    $result->username=$user['username'] ?? '';
}
http_response_code($status);
header('Content-Type: application/json; charset=utf-8');
echo json_encode($result,JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
