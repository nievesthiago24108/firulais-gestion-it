<?php
// models/MantenimientoModel.php
// Plan de mantenimiento preventivo (punto 4 del Trabajo Final).

class MantenimientoModel extends Model
{
    /** Meses entre mantenimientos según el tipo de equipo. */
    public static function intervalo(string $tipo): int
    {
        return in_array($tipo, ['servidor', 'switch', 'router', 'access_point'], true) ? 3 : 6;
    }

    /** Todos los equipos en servicio con los días que faltan para el próximo mantenimiento. */
    public function plan(): array
    {
        return $this->all(
            'SELECT e.id, e.codigo, e.tipo, e.marca, e.modelo, e.anio_fabricacion, e.estado,
                    e.ultimo_mantenimiento, e.proximo_mantenimiento, e.observaciones,
                    DATEDIFF(e.proximo_mantenimiento, CURDATE()) AS dias_restantes,
                    s.nombre AS sector, s.piso, u.nombre AS asignado_nombre
             FROM equipos e JOIN sectores s ON s.id = e.sector_id LEFT JOIN usuarios u ON u.id = e.asignado_a
             WHERE e.estado <> "baja"
             ORDER BY e.proximo_mantenimiento IS NULL, e.proximo_mantenimiento, e.codigo'
        );
    }

    public function historial(array $f = []): array
    {
        $where = [];
        $p = [];
        if (!empty($f['equipo_id'])) {
            $where[] = 'm.equipo_id = ?';
            $p[] = $f['equipo_id'];
        }
        return $this->all(
            'SELECT m.*, e.codigo AS equipo_codigo, t.nombre AS tecnico FROM mantenimientos m
             JOIN equipos e ON e.id = m.equipo_id LEFT JOIN usuarios t ON t.id = m.tecnico_id'
            . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY m.fecha DESC, m.id DESC LIMIT 200',
            $p
        );
    }

    /** Registra el mantenimiento y mueve las fechas del equipo. */
    public function create(array $d): int
    {
        return Database::transaction(function () use ($d) {
            $equipo = $this->findOrFail('equipos', $d['equipo_id'], 'Equipo', true);
            if ($d['fecha'] > date('Y-m-d')) {
                throw new HttpError(422, 'Revisá los datos ingresados.', ['fecha' => 'No puede ser una fecha futura.']);
            }
            $d['proximo'] ??= (new DateTime($d['fecha']))->modify('+' . self::intervalo($equipo['tipo']) . ' months')->format('Y-m-d');
            if ($d['proximo'] <= $d['fecha']) {
                throw new HttpError(422, 'Revisá los datos ingresados.', ['proximo' => 'Tiene que ser posterior al mantenimiento.']);
            }
            $d['tecnico_id'] = Auth::id();
            $id = $this->insertRow('mantenimientos', $d);
            if (!$equipo['ultimo_mantenimiento'] || $d['fecha'] >= $equipo['ultimo_mantenimiento']) {
                $this->run(
                    'UPDATE equipos SET ultimo_mantenimiento = ?, proximo_mantenimiento = ? WHERE id = ?',
                    [$d['fecha'], $d['proximo'], $equipo['id']]
                );
            }
            ActividadModel::log("registró mantenimiento {$d['tipo']} de {$equipo['codigo']}", 'mantenimiento', $id);
            return $id;
        });
    }
}
