<?php
// core/Database.php
// Conexión PDO única para toda la petición (patrón Singleton).

require_once __DIR__ . '/../config/config.php';

class Database
{
    private static ?Database $instancia = null;
    private PDO $conexion;

    private function __construct()
    {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $this->conexion = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        // misma zona horaria que PHP para NOW() y CURDATE()
        $this->conexion->exec("SET time_zone = '" . (new DateTime())->format('P') . "'");
    }

    public static function getInstance(): Database
    {
        return self::$instancia ??= new Database();
    }

    public function getConnection(): PDO
    {
        return $this->conexion;
    }

    /** Ejecuta $fn dentro de una transacción; si algo falla se deshace todo. */
    public static function transaction(callable $fn)
    {
        $db = self::getInstance()->getConnection();
        $db->beginTransaction();
        try {
            $resultado = $fn($db);
            $db->commit();
            return $resultado;
        } catch (Throwable $e) {
            $db->rollBack();
            throw $e;
        }
    }
}
