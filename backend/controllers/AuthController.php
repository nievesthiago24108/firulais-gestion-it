<?php
// controllers/AuthController.php

class AuthController
{
    public function login(Request $req): void
    {
        $d = Validator::check($req->body(), ['email' => 'required|email', 'password' => 'required|string:200']);
        $model = new UsuarioModel();
        $u = $model->findByEmail($d['email']);
        if ($u && $u['bloqueado_hasta'] && strtotime($u['bloqueado_hasta']) > time()) {
            $min = (int) ceil((strtotime($u['bloqueado_hasta']) - time()) / 60);
            throw new HttpError(429, "Demasiados intentos fallidos. Probá de nuevo en $min minuto" . ($min > 1 ? 's' : '') . '.');
        }
        if (!$u || !password_verify($d['password'], $u['password_hash'])) {
            if ($u) {
                $model->registrarIntento($u, false);
            }
            throw new HttpError(401, 'Email o contraseña incorrectos.');
        }
        if (!$u['activo']) {
            throw new HttpError(403, 'Tu usuario está deshabilitado. Consultá con el administrador.');
        }
        $model->registrarIntento($u, true);
        Auth::login($u);
        $this->me($req);
    }

    public function logout(Request $req): void
    {
        Auth::logout();
        Response::json(['ok' => true]);
    }

    /** Devuelve el usuario actual (o null) y el token CSRF para las próximas peticiones. */
    public function me(Request $req): void
    {
        Response::json(['usuario' => Auth::user(), 'csrf' => Auth::csrf()]);
    }
}
