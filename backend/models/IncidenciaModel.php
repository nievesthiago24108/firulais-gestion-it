<?php
// models/IncidenciaModel.php
// Tickets de soporte. Los cambios de estado actualizan el estado del equipo afectado.

class IncidenciaModel extends Model
{
    public const ESTADOS = [
        'abierta' => 'Abierta', 'en_reparacion' => 'En reparación', 'esperando_repuesto' => 'Esperando repuesto',
        'resuelta' => 'Resuelta', 'cerrada' => 'Cerrada',
    ];

    private const SELECT = 'SELECT i.*, e.codigo AS equipo_codigo, e.tipo AS equipo_tipo, e.marca AS equipo_marca,
            e.modelo AS equipo_modelo, s.nombre AS sector, s.piso,
            r.nombre AS reportado_nombre, t.nombre AS asignado_nombre
        FROM incidencias i
        JOIN equipos e ON e.id = i.equipo_id
        JOIN sectores s ON s.id = e.sector_id
        JOIN usuarios r ON r.id = i.reportado_por
        LEFT JOIN usuarios t ON t.id = i.asignado_a';

    /** Filtros: estado, prioridad, asignado_a, reportado_por, equipo_id, q. */
    public function list(array $f = []): array
    {
        $where = [];
        $p = [];
        foreach (['estado', 'prioridad', 'asignado_a', 'reportado_por', 'equipo_id'] as $k) {
            if (isset($f[$k]) && $f[$k] !== '') {
                $where[] = "i.$k = ?";
                $p[] = $f[$k];
            }
        }
        if (!empty($f['q'])) {
            $where[] = '(i.titulo LIKE ? OR i.descripcion LIKE ? OR e.codigo LIKE ? OR r.nombre LIKE ?)';
            array_push($p, ...array_fill(0, 4, '%' . $f['q'] . '%'));
        }
        $orden = ' ORDER BY i.estado IN ("resuelta", "cerrada"), FIELD(i.prioridad, "critica", "alta", "media", "baja"), i.creada DESC';
        return $this->all(self::SELECT . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . $orden, $p);
    }

    public function find(int $id): array
    {
        $i = $this->one(self::SELECT . ' WHERE i.id = ?', [$id]);
        if (!$i) {
            throw new HttpError(404, 'Incidencia no encontrada.');
        }
        $i['eventos'] = $this->all(
            'SELECT ev.id, ev.tipo, ev.detalle, ev.fecha, u.nombre AS usuario
             FROM incidencia_eventos ev LEFT JOIN usuarios u ON u.id = ev.usuario_id
             WHERE ev.incidencia_id = ? ORDER BY ev.fecha, ev.id',
            [$id]
        );
        $i['repuestos'] = $this->all(
            'SELECT ir.id, ir.cantidad, ir.fecha, r.nombre FROM incidencia_repuestos ir
             JOIN repuestos r ON r.id = ir.repuesto_id WHERE ir.incidencia_id = ? ORDER BY ir.fecha',
            [$id]
        );
        return $i;
    }

    public function create(array $d): int
    {
        return Database::transaction(function () use ($d) {
            $this->findOrFail('equipos', $d['equipo_id'], 'Equipo');
            $d['reportado_por'] = Auth::id();
            $id = $this->insertRow('incidencias', $d);
            $this->evento($id, 'creada', 'Incidencia reportada');
            ActividadModel::log("reportó la incidencia «{$d['titulo']}»", 'incidencia', $id);
            return $id;
        });
    }

    /** Cambios del personal de IT: asignación, prioridad, componente, estado y solución. */
    public function update(int $id, array $d): void
    {
        Database::transaction(function () use ($id, $d) {
            $actual = $this->findOrFail('incidencias', $id, 'Incidencia', true);
            if ($actual['estado'] === 'cerrada') {
                throw new HttpError(409, 'La incidencia está cerrada y no admite cambios.');
            }
            if (array_key_exists('asignado_a', $d) && $d['asignado_a'] != $actual['asignado_a']) {
                $tecnico = $d['asignado_a'] ? $this->one(
                    'SELECT nombre FROM usuarios WHERE id = ? AND rol IN ("admin", "tecnico") AND activo = 1',
                    [$d['asignado_a']]
                ) : null;
                if ($d['asignado_a'] && !$tecnico) {
                    throw new HttpError(422, 'Revisá los datos ingresados.', ['asignado_a' => 'Elegí un técnico activo.']);
                }
                $this->evento($id, 'asignacion', $tecnico ? "Asignada a {$tecnico['nombre']}" : 'Sin técnico asignado');
            }
            if (isset($d['prioridad']) && $d['prioridad'] !== $actual['prioridad']) {
                $this->evento($id, 'estado', 'Prioridad: ' . ucfirst($d['prioridad']));
            }
            $nuevo = $d['estado'] ?? $actual['estado'];
            if ($nuevo !== $actual['estado']) {
                if (in_array($nuevo, ['resuelta', 'cerrada'], true) && empty($d['solucion'] ?? $actual['solucion'])) {
                    throw new HttpError(422, 'Revisá los datos ingresados.', ['solucion' => 'Describí la solución aplicada.']);
                }
                $d['resuelta_en'] = in_array($nuevo, ['resuelta', 'cerrada'], true) ? ($actual['resuelta_en'] ?? date('Y-m-d H:i:s')) : null;
                if ($nuevo !== 'abierta' && empty($d['asignado_a'] ?? $actual['asignado_a'])) {
                    $d['asignado_a'] = Auth::id();   // quien la toma queda asignado
                    $this->evento($id, 'asignacion', 'Asignada a ' . Auth::user()['nombre']);
                }
                $detalle = 'Estado: ' . self::ESTADOS[$nuevo] . (in_array($nuevo, ['resuelta', 'cerrada'], true) && !empty($d['solucion']) ? " — {$d['solucion']}" : '');
                $this->evento($id, 'estado', $detalle);
                $this->sincronizarEquipo((int) $actual['equipo_id'], $id, $nuevo);
                ActividadModel::log('cambió a «' . self::ESTADOS[$nuevo] . "» la incidencia «{$actual['titulo']}»", 'incidencia', $id);
            }
            $this->updateRow('incidencias', $id, $d);
        });
    }

    /** En reparación ⇒ equipo en reparación; al resolverse vuelve a operativo si no tiene otras abiertas en curso. */
    private function sincronizarEquipo(int $equipoId, int $incidenciaId, string $estado): void
    {
        if (in_array($estado, ['en_reparacion', 'esperando_repuesto'], true)) {
            $this->run('UPDATE equipos SET estado = "en_reparacion" WHERE id = ? AND estado IN ("operativo", "deposito")', [$equipoId]);
            return;
        }
        $otras = $this->one(
            'SELECT COUNT(*) AS n FROM incidencias WHERE equipo_id = ? AND id <> ? AND estado IN ("en_reparacion", "esperando_repuesto")',
            [$equipoId, $incidenciaId]
        );
        if (!$otras['n']) {
            $this->run(
                'UPDATE equipos SET estado = IF(prestable = 1, "deposito", "operativo") WHERE id = ? AND estado = "en_reparacion"',
                [$equipoId]
            );
        }
    }

    public function comentar(int $id, string $texto): void
    {
        $this->findOrFail('incidencias', $id, 'Incidencia');
        $this->evento($id, 'comentario', $texto);
    }

    /** Descuenta stock y deja constancia en la misma transacción; nunca deja stock negativo. */
    public function usarRepuesto(int $id, int $repuestoId, int $cantidad): void
    {
        Database::transaction(function () use ($id, $repuestoId, $cantidad) {
            $inc = $this->findOrFail('incidencias', $id, 'Incidencia', true);
            if (in_array($inc['estado'], ['resuelta', 'cerrada'], true)) {
                throw new HttpError(409, 'No se pueden agregar repuestos a una incidencia resuelta.');
            }
            $rep = $this->findOrFail('repuestos', $repuestoId, 'Repuesto', true);
            if ($rep['stock'] < $cantidad) {
                throw new HttpError(409, "Stock insuficiente de {$rep['nombre']}: quedan {$rep['stock']}.");
            }
            $this->run('UPDATE repuestos SET stock = stock - ? WHERE id = ?', [$cantidad, $repuestoId]);
            $this->insertRow('incidencia_repuestos', [
                'incidencia_id' => $id, 'repuesto_id' => $repuestoId, 'cantidad' => $cantidad, 'usuario_id' => Auth::id(),
            ]);
            $this->evento($id, 'repuesto', "Se usó $cantidad × {$rep['nombre']}");
            ActividadModel::log("usó $cantidad × {$rep['nombre']} en «{$inc['titulo']}»", 'repuesto', $repuestoId);
        });
    }

    public function esDe(int $id, int $usuarioId): bool
    {
        return (bool) $this->one('SELECT 1 FROM incidencias WHERE id = ? AND reportado_por = ?', [$id, $usuarioId]);
    }

    public function porPrioridad(): array
    {
        return $this->all(
            'SELECT prioridad, COUNT(*) AS total FROM incidencias WHERE estado NOT IN ("resuelta", "cerrada")
             GROUP BY prioridad ORDER BY FIELD(prioridad, "critica", "alta", "media", "baja")'
        );
    }

    private function evento(int $id, string $tipo, string $detalle): void
    {
        $this->run(
            'INSERT INTO incidencia_eventos (incidencia_id, usuario_id, tipo, detalle) VALUES (?, ?, ?, ?)',
            [$id, Auth::id(), $tipo, $detalle]
        );
    }
}
