<?php
// models/UsuarioModel.php

class UsuarioModel extends Model
{
    private const CAMPOS = 'u.id, u.nombre, u.email, u.rol, u.sector_id, u.activo, u.creado, s.nombre AS sector, s.piso';

    public function findByEmail(string $email): ?array
    {
        return $this->one('SELECT * FROM usuarios WHERE email = ?', [$email]);
    }

    public function list(array $f = []): array
    {
        $where = ['1 = 1'];
        $p = [];
        if (!empty($f['rol'])) {
            $where[] = 'u.rol = ?';
            $p[] = $f['rol'];
        }
        if (!empty($f['activos'])) {
            $where[] = 'u.activo = 1';
        }
        return $this->all(
            'SELECT ' . self::CAMPOS . ' FROM usuarios u LEFT JOIN sectores s ON s.id = u.sector_id
             WHERE ' . implode(' AND ', $where) . ' ORDER BY FIELD(u.rol, "admin", "tecnico", "empleado"), u.nombre',
            $p
        );
    }

    public function find(int $id): array
    {
        $u = $this->one('SELECT ' . self::CAMPOS . ' FROM usuarios u LEFT JOIN sectores s ON s.id = u.sector_id WHERE u.id = ?', [$id]);
        if (!$u) {
            throw new HttpError(404, 'Usuario no encontrado.');
        }
        return $u;
    }

    public function create(array $d): int
    {
        $d['password_hash'] = password_hash($d['password'], PASSWORD_DEFAULT);
        unset($d['password']);
        return $this->insertRow('usuarios', $d);
    }

    public function update(int $id, array $d): void
    {
        if (!empty($d['password'])) {
            $d['password_hash'] = password_hash($d['password'], PASSWORD_DEFAULT);
        }
        unset($d['password']);
        $this->updateRow('usuarios', $id, $d);
    }

    public function registrarIntento(array $u, bool $exitoso): void
    {
        if ($exitoso) {
            $this->run('UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?', [$u['id']]);
            return;
        }
        $intentos = $u['intentos_fallidos'] + 1;
        $bloqueo = $intentos >= LOGIN_MAX_INTENTOS ? date('Y-m-d H:i:s', time() + LOGIN_BLOQUEO_MINUTOS * 60) : null;
        $this->run(
            'UPDATE usuarios SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id = ?',
            [$bloqueo ? 0 : $intentos, $bloqueo, $u['id']]
        );
    }
}
