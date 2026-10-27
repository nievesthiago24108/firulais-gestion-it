<?php
// models/PrestamoModel.php
// Préstamos de equipos del depósito IT: pendiente → activo → devuelto (o rechazado).
// Cada transición bloquea el préstamo y el equipo (FOR UPDATE) para que no se preste dos veces.

class PrestamoModel extends Model
{
    private const SELECT = 'SELECT p.*, (p.estado = "activo" AND p.fecha_limite < NOW()) AS demorado,
            e.codigo AS equipo_codigo, e.tipo AS equipo_tipo, e.marca AS equipo_marca, e.modelo AS equipo_modelo,
            u.nombre AS solicitante_nombre, s.nombre AS solicitante_sector, a.nombre AS aprobado_nombre
        FROM prestamos p
        JOIN equipos e ON e.id = p.equipo_id
        JOIN usuarios u ON u.id = p.solicitante_id
        LEFT JOIN sectores s ON s.id = u.sector_id
        LEFT JOIN usuarios a ON a.id = p.aprobado_por';

    /** Filtros: estado (también "demorado"), solicitante_id, q. */
    public function list(array $f = []): array
    {
        $where = [];
        $p = [];
        if (($f['estado'] ?? '') === 'demorado') {
            $where[] = 'p.estado = "activo" AND p.fecha_limite < NOW()';
        } elseif (!empty($f['estado'])) {
            $where[] = 'p.estado = ?';
            $p[] = $f['estado'];
        }
        if (!empty($f['solicitante_id'])) {
            $where[] = 'p.solicitante_id = ?';
            $p[] = $f['solicitante_id'];
        }
        if (!empty($f['q'])) {
            $where[] = '(e.codigo LIKE ? OR u.nombre LIKE ? OR p.motivo LIKE ?)';
            array_push($p, ...array_fill(0, 3, '%' . $f['q'] . '%'));
        }
        $orden = ' ORDER BY FIELD(p.estado, "pendiente", "activo", "devuelto", "rechazado"), p.fecha_limite < NOW() DESC, p.fecha_solicitud DESC';
        return $this->all(self::SELECT . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . $orden, $p);
    }

    public function find(int $id): array
    {
        $p = $this->one(self::SELECT . ' WHERE p.id = ?', [$id]);
        if (!$p) {
            throw new HttpError(404, 'Préstamo no encontrado.');
        }
        return $p;
    }

    /** Si $entregar es true (personal de IT), el préstamo queda activo en el acto. */
    public function create(array $d, bool $entregar): int
    {
        return Database::transaction(function () use ($d, $entregar) {
            $equipo = $this->findOrFail('equipos', $d['equipo_id'], 'Equipo', true);
            $this->verificarDisponible($equipo);
            if (strtotime($d['fecha_limite']) <= time()) {
                throw new HttpError(422, 'Revisá los datos ingresados.', ['fecha_limite' => 'La devolución tiene que ser posterior a ahora.']);
            }
            if ($entregar) {
                $d += ['estado' => 'activo', 'aprobado_por' => Auth::id(), 'fecha_entrega' => date('Y-m-d H:i:s')];
                $this->run('UPDATE equipos SET estado = "en_prestamo" WHERE id = ?', [$equipo['id']]);
            }
            $id = $this->insertRow('prestamos', $d);
            ActividadModel::log(($entregar ? 'entregó ' : 'solicitó el préstamo de ') . $equipo['codigo'], 'prestamo', $id);
            return $id;
        });
    }

    public function aprobar(int $id): void
    {
        Database::transaction(function () use ($id) {
            $p = $this->estadoRequerido($id, 'pendiente');
            $equipo = $this->findOrFail('equipos', $p['equipo_id'], 'Equipo', true);
            if ($equipo['estado'] !== 'deposito') {
                throw new HttpError(409, "{$equipo['codigo']} no está disponible en el depósito.");
            }
            $this->run(
                'UPDATE prestamos SET estado = "activo", aprobado_por = ?, fecha_entrega = NOW() WHERE id = ?',
                [Auth::id(), $id]
            );
            $this->run('UPDATE equipos SET estado = "en_prestamo" WHERE id = ?', [$equipo['id']]);
            ActividadModel::log("entregó {$equipo['codigo']} en préstamo", 'prestamo', $id);
        });
    }

    public function rechazar(int $id, ?string $motivo, bool $porSolicitante): void
    {
        Database::transaction(function () use ($id, $motivo, $porSolicitante) {
            $this->estadoRequerido($id, 'pendiente');
            $obs = $porSolicitante ? 'Cancelado por el solicitante' : ($motivo ?: 'Rechazado');
            $this->run(
                'UPDATE prestamos SET estado = "rechazado", aprobado_por = ?, observaciones = ? WHERE id = ?',
                [Auth::id(), $obs, $id]
            );
            ActividadModel::log($porSolicitante ? 'canceló su solicitud de préstamo' : 'rechazó una solicitud de préstamo', 'prestamo', $id);
        });
    }

    public function devolver(int $id, ?string $observaciones): void
    {
        Database::transaction(function () use ($id, $observaciones) {
            $p = $this->estadoRequerido($id, 'activo');
            $this->run(
                'UPDATE prestamos SET estado = "devuelto", fecha_devolucion = NOW(), observaciones = ? WHERE id = ?',
                [$observaciones, $id]
            );
            $equipo = $this->findOrFail('equipos', $p['equipo_id'], 'Equipo', true);
            $this->run('UPDATE equipos SET estado = "deposito" WHERE id = ? AND estado = "en_prestamo"', [$equipo['id']]);
            ActividadModel::log("registró la devolución de {$equipo['codigo']}", 'prestamo', $id);
        });
    }

    private function estadoRequerido(int $id, string $estado): array
    {
        $p = $this->findOrFail('prestamos', $id, 'Préstamo', true);
        if ($p['estado'] !== $estado) {
            throw new HttpError(409, 'El préstamo ya no está ' . ($estado === 'pendiente' ? 'pendiente' : 'activo') . '.');
        }
        return $p;
    }

    private function verificarDisponible(array $equipo): void
    {
        if (!$equipo['prestable']) {
            throw new HttpError(409, "{$equipo['codigo']} no está habilitado para préstamos.");
        }
        $ocupado = $this->one(
            'SELECT 1 FROM prestamos WHERE equipo_id = ? AND estado IN ("pendiente", "activo")',
            [$equipo['id']]
        );
        if ($equipo['estado'] !== 'deposito' || $ocupado) {
            throw new HttpError(409, "{$equipo['codigo']} ya está prestado o tiene una solicitud pendiente.");
        }
    }
}
