<?php
// core/Http.php
// Petición entrante, respuesta JSON y errores HTTP.

class HttpError extends Exception
{
    public function __construct(public int $status, string $mensaje, public array $campos = [])
    {
        parent::__construct($mensaje);
    }
}

class Request
{
    public string $method;
    public string $path;
    public array $params = [];   // parámetros de la ruta, p. ej. {id}
    private ?array $body = null;

    public function __construct()
    {
        $this->method = $_SERVER['REQUEST_METHOD'];
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        // todo lo que va después de /api (funciona en la raíz o en una subcarpeta de htdocs)
        $pos = strpos($uri, '/api/');
        $this->path = '/' . trim($pos === false ? '' : substr($uri, $pos + 5), '/');
    }

    public function query(string $clave, $porDefecto = null)
    {
        $v = $_GET[$clave] ?? null;
        return ($v === null || $v === '') ? $porDefecto : $v;
    }

    public function body(): array
    {
        if ($this->body === null) {
            $datos = json_decode(file_get_contents('php://input') ?: '{}', true);
            if (!is_array($datos)) {
                throw new HttpError(400, 'El cuerpo de la petición no es JSON válido.');
            }
            $this->body = $datos;
        }
        return $this->body;
    }

    public function id(): int
    {
        return (int) $this->params['id'];
    }
}

class Response
{
    public static function json($datos, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    }
}
