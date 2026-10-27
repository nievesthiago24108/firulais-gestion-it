<?php
// core/Model.php
// Clase base de los modelos: atajos para consultas preparadas con PDO.

require_once __DIR__ . '/Database.php';

abstract class Model
{
    protected PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    protected function all(string $sql, array $params = []): array
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    protected function one(string $sql, array $params = []): ?array
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch() ?: null;
    }

    protected function run(string $sql, array $params = []): int
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    /** $datos ya pasó por Validator, así que sus claves son columnas conocidas. */
    protected function insertRow(string $tabla, array $datos): int
    {
        $cols = array_keys($datos);
        $sql = "INSERT INTO $tabla (" . implode(', ', $cols) . ') VALUES (:' . implode(', :', $cols) . ')';
        $this->run($sql, $datos);
        return (int) $this->db->lastInsertId();
    }

    protected function updateRow(string $tabla, int $id, array $datos): void
    {
        if (!$datos) {
            return;
        }
        $sets = implode(', ', array_map(fn($c) => "$c = :$c", array_keys($datos)));
        $this->run("UPDATE $tabla SET $sets WHERE id = :id", $datos + ['id' => $id]);
    }

    /** Busca por id o responde 404. */
    protected function findOrFail(string $tabla, int $id, string $que, bool $bloquear = false): array
    {
        $fila = $this->one("SELECT * FROM $tabla WHERE id = ?" . ($bloquear ? ' FOR UPDATE' : ''), [$id]);
        if (!$fila) {
            throw new HttpError(404, "$que no encontrado.");
        }
        return $fila;
    }
}
