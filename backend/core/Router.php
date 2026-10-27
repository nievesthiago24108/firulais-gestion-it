<?php
// core/Router.php
// Asocia método + ruta con Controlador::acción y los roles que pueden usarla.

class Router
{
    private array $rutas = [];

    /** $roles vacío = solo requiere sesión iniciada; null = ruta pública. */
    public function add(string $method, string $patron, array $accion, ?array $roles = []): void
    {
        $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>\d+)', $patron) . '$#';
        $this->rutas[] = [$method, $regex, $accion, $roles];
    }

    public function dispatch(Request $req): void
    {
        $metodoPermitido = false;
        foreach ($this->rutas as [$method, $regex, [$clase, $metodo], $roles]) {
            if (!preg_match($regex, $req->path, $m)) {
                continue;
            }
            if ($method !== $req->method) {
                $metodoPermitido = true;
                continue;
            }
            $req->params = array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY);
            if ($roles !== null) {
                Auth::requireRole($roles);
                Auth::checkCsrf($req);
            }
            (new $clase())->$metodo($req);
            return;
        }
        throw new HttpError($metodoPermitido ? 405 : 404, $metodoPermitido ? 'Método no permitido.' : 'Recurso no encontrado.');
    }
}
