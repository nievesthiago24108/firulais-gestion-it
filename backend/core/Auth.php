<?php
// core/Auth.php
// Sesión del usuario, control de roles y protección CSRF.

class Auth
{
    public static function start(): void
    {
        session_name('FIRULAISSESSID');
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax',
            'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        ]);
        session_start();
        $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    }

    public static function login(array $usuario): void
    {
        session_regenerate_id(true);   // evita la fijación de sesión
        $_SESSION['usuario'] = [
            'id' => (int) $usuario['id'],
            'nombre' => $usuario['nombre'],
            'email' => $usuario['email'],
            'rol' => $usuario['rol'],
            'sector_id' => $usuario['sector_id'] === null ? null : (int) $usuario['sector_id'],
        ];
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }

    public static function logout(): void
    {
        $_SESSION = [];
        session_destroy();
    }

    public static function user(): ?array
    {
        return $_SESSION['usuario'] ?? null;
    }

    public static function id(): int
    {
        return self::user()['id'];
    }

    public static function is(string ...$roles): bool
    {
        return in_array(self::user()['rol'] ?? null, $roles, true);
    }

    /** Personal de IT (administrador o técnico). */
    public static function isStaff(): bool
    {
        return self::is('admin', 'tecnico');
    }

    public static function csrf(): string
    {
        return $_SESSION['csrf'];
    }

    public static function requireRole(array $roles): void
    {
        if (!self::user()) {
            throw new HttpError(401, 'Tu sesión expiró. Volvé a ingresar.');
        }
        if ($roles && !self::is(...$roles)) {
            throw new HttpError(403, 'No tenés permiso para realizar esta acción.');
        }
    }

    /** Las peticiones que modifican datos deben traer el token en el header X-CSRF-Token. */
    public static function checkCsrf(Request $req): void
    {
        if (in_array($req->method, ['GET', 'HEAD', 'OPTIONS'], true)) {
            return;
        }
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!hash_equals(self::csrf(), $token)) {
            throw new HttpError(419, 'La sesión no es válida. Recargá la página.');
        }
    }
}
