<?php
// models/ActividadModel.php
// Registro de auditoría: quién hizo qué y cuándo.

class ActividadModel extends Model
{
    public static function log(string $accion, string $entidad, ?int $entidadId): void
    {
        (new self())->run(
            'INSERT INTO actividad (usuario_id, accion, entidad, entidad_id) VALUES (?, ?, ?, ?)',
            [Auth::user()['id'] ?? null, $accion, $entidad, $entidadId]
        );
    }

    public function recientes(int $limite = 10): array
    {
        return $this->all(
            'SELECT a.id, a.accion, a.entidad, a.entidad_id, a.fecha, u.nombre AS usuario
             FROM actividad a LEFT JOIN usuarios u ON u.id = a.usuario_id
             ORDER BY a.fecha DESC, a.id DESC LIMIT ' . (int) $limite
        );
    }
}
