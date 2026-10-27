<?php
// models/EquipoModel.php

class EquipoModel extends Model
{
    private const SELECT = 'SELECT e.*, s.nombre AS sector, s.piso, u.nombre AS asignado_nombre,
            (SELECT COUNT(*) FROM incidencias i WHERE i.equipo_id = e.id AND i.estado NOT IN ("resuelta", "cerrada")) AS incidencias_abiertas
        FROM equipos e
        JOIN sectores s ON s.id = e.sector_id
        LEFT JOIN usuarios u ON u.id = e.asignado_a';

    /** Filtros: q, piso, sector_id, tipo, estado, asignado_a, incluir_baja. */
    public function list(array $f = []): array
    {
        $where = [];
        $p = [];
        foreach (['tipo' => 'e.tipo', 'estado' => 'e.estado', 'sector_id' => 'e.sector_id', 'piso' => 's.piso', 'asignado_a' => 'e.asignado_a'] as $k => $col) {
            if (isset($f[$k]) && $f[$k] !== '') {
                $where[] = "$col = ?";
                $p[] = $f[$k];
            }
        }
        if (!empty($f['reportables_de'])) {
            $where[] = '(e.asignado_a = ? OR (e.sector_id = ? AND e.asignado_a IS NULL))';
            array_push($p, $f['reportables_de'], $f['sector_de'] ?? 0);
        }
        if (empty($f['estado']) && empty($f['incluir_baja'])) {
            $where[] = 'e.estado <> "baja"';
        }
        if (!empty($f['q'])) {
            $where[] = '(e.codigo LIKE ? OR e.marca LIKE ? OR e.modelo LIKE ? OR e.nro_serie LIKE ? OR e.ip LIKE ? OR u.nombre LIKE ? OR s.nombre LIKE ?)';
            array_push($p, ...array_fill(0, 7, '%' . $f['q'] . '%'));
        }
        $sql = self::SELECT . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY s.piso, s.nombre, e.codigo';
        return $this->all($sql, $p);
    }

    public function find(int $id): array
    {
        $e = $this->one(self::SELECT . ' WHERE e.id = ?', [$id]);
        if (!$e) {
            throw new HttpError(404, 'Equipo no encontrado.');
        }
        return $e;
    }

    public function historial(int $id): array
    {
        return [
            'incidencias' => $this->all(
                'SELECT i.id, i.titulo, i.estado, i.prioridad, i.componente, i.creada, i.resuelta_en, t.nombre AS tecnico
                 FROM incidencias i LEFT JOIN usuarios t ON t.id = i.asignado_a WHERE i.equipo_id = ? ORDER BY i.creada DESC',
                [$id]
            ),
            'mantenimientos' => $this->all(
                'SELECT m.id, m.fecha, m.tipo, m.tareas, m.observaciones, m.proximo, t.nombre AS tecnico
                 FROM mantenimientos m LEFT JOIN usuarios t ON t.id = m.tecnico_id WHERE m.equipo_id = ? ORDER BY m.fecha DESC, m.id DESC',
                [$id]
            ),
            'prestamos' => $this->all(
                'SELECT p.id, p.estado, p.fecha_solicitud, p.fecha_entrega, p.fecha_limite, p.fecha_devolucion, u.nombre AS solicitante
                 FROM prestamos p JOIN usuarios u ON u.id = p.solicitante_id WHERE p.equipo_id = ? ORDER BY p.fecha_solicitud DESC',
                [$id]
            ),
        ];
    }

    /** Equipos que se pueden pedir prestados ahora. */
    public function disponibles(): array
    {
        return $this->all(
            'SELECT e.id, e.codigo, e.tipo, e.marca, e.modelo FROM equipos e
             WHERE e.prestable = 1 AND e.estado = "deposito"
               AND NOT EXISTS (SELECT 1 FROM prestamos p WHERE p.equipo_id = e.id AND p.estado IN ("pendiente", "activo"))
             ORDER BY e.tipo, e.codigo'
        );
    }

    public function create(array $d): int
    {
        return $this->insertRow('equipos', $d);
    }

    public function update(int $id, array $d): void
    {
        $this->findOrFail('equipos', $id, 'Equipo');
        $this->updateRow('equipos', $id, $d);
    }

    public function porPiso(): array
    {
        return $this->all(
            'SELECT s.piso,
                    CAST(SUM(e.tipo = "pc") AS UNSIGNED) AS pcs, CAST(SUM(e.tipo = "impresora") AS UNSIGNED) AS impresoras,
                    CAST(SUM(e.tipo NOT IN ("pc", "impresora")) AS UNSIGNED) AS otros,
                    CAST(SUM(e.estado = "en_reparacion") AS UNSIGNED) AS en_reparacion, COUNT(*) AS total
             FROM equipos e JOIN sectores s ON s.id = e.sector_id
             WHERE e.estado <> "baja" GROUP BY s.piso ORDER BY s.piso'
        );
    }
}
