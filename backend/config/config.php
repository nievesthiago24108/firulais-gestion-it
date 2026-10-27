<?php
// config/config.php
// Configuración general. Cada valor se puede sobrescribir con una variable de entorno
// (en NGINX: fastcgi_param; en XAMPP quedan los valores por defecto).

function env(string $clave, string $porDefecto): string
{
    $valor = getenv($clave);
    return $valor === false ? $porDefecto : $valor;
}

define('DB_HOST', env('DB_HOST', 'localhost'));
define('DB_PORT', env('DB_PORT', '3306'));
define('DB_NAME', env('DB_NAME', 'firulais'));
define('DB_USER', env('DB_USER', 'root'));
define('DB_PASS', env('DB_PASS', ''));            // XAMPP trae root sin contraseña

define('APP_DEBUG', env('APP_DEBUG', '0') === '1'); // muestra el detalle de los errores (solo desarrollo)
define('APP_TIMEZONE', 'America/Argentina/Rio_Gallegos');
define('LOGIN_MAX_INTENTOS', 5);                   // intentos fallidos antes de bloquear
define('LOGIN_BLOQUEO_MINUTOS', 10);

date_default_timezone_set(APP_TIMEZONE);
