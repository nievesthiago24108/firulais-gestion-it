<?php
// models/RepuestoModel.php

class RepuestoModel extends Model
{
    public function list(array $f = []): array
    {
        $where = [];
        $p = [];
        if (!empty($f['categoria'])) {
            $where[] = 'categoria = ?';
            $p[] = $f['categoria'];
        }
        if (!empty($f['bajo_stock'])) {
            $where[] = 'stock <= stock_minimo';
        }
        if (!empty($f['q'])) {
            $where[] = '(nombre LIKE ? OR compatible_con LIKE ?)';
            array_push($p, '%' . $f['q'] . '%', '%' . $f['q'] . '%');
        }
        return $this->all(
            'SELECT *, stock <= stock_minimo AS bajo_stock FROM repuestos'
            . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY stock <= stock_minimo DESC, categoria, nombre',
            $p
        );
    }

    public function create(array $d): int
    {
        $id = $this->insertRow('repuestos', $d);
        ActividadModel::log("dio de alta el repuesto {$d['nombre']}", 'repuesto', $id);
        return $id;
    }

    public function update(int $id, array $d): void
    {
        $this->findOrFail('repuestos', $id, 'Repuesto');
        $this->updateRow('repuestos', $id, $d);
    }

    /** Ingreso (+) o egreso (−) manual de stock. */
    public function ajustar(int $id, int $delta, string $motivo): array
    {
        return Database::transaction(function () use ($id, $delta, $motivo) {
            $r = $this->findOrFail('repuestos', $id, 'Repuesto', true);
            if ($r['stock'] + $delta < 0) {
                throw new HttpError(409, "No hay stock suficiente: quedan {$r['stock']}.");
            }
            $this->run('UPDATE repuestos SET stock = stock + ? WHERE id = ?', [$delta, $id]);
            $verbo = $delta > 0 ? 'ingresó' : 'retiró';
            ActividadModel::log("$verbo " . abs($delta) . " × {$r['nombre']} ($motivo)", 'repuesto', $id);
            return $this->one('SELECT *, stock <= stock_minimo AS bajo_stock FROM repuestos WHERE id = ?', [$id]);
        });
    }
}
