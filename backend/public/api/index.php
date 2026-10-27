<?php
// public/api/index.php
// Front Controller: toda petición a /api/... entra por acá, se enruta al controlador
// correspondiente y siempre se responde JSON.

$base = dirname(__DIR__, 2);
spl_autoload_register(function (string $clase) use ($base) {
    foreach (['core', 'models', 'controllers'] as $dir) {
        if (is_file("$base/$dir/$clase.php")) {
            require_once "$base/$dir/$clase.php";
            return;
        }
    }
});
require_once "$base/core/Http.php";   // define Request, Response y HttpError juntos
require_once "$base/config/config.php";

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$staff = ['admin', 'tecnico'];
$router = new Router();

// Sesión (rutas públicas: null)
$router->add('POST', '/auth/login', [AuthController::class, 'login'], null);
$router->add('POST', '/auth/logout', [AuthController::class, 'logout'], null);
$router->add('GET', '/auth/me', [AuthController::class, 'me'], null);

// Cualquier usuario con sesión iniciada ([]) — los controladores filtran lo que ve un empleado
$router->add('GET', '/dashboard', [DashboardController::class, 'index']);
$router->add('GET', '/sectores', [SectoresController::class, 'index']);
$router->add('GET', '/equipos', [EquiposController::class, 'index']);
$router->add('GET', '/equipos/disponibles', [EquiposController::class, 'disponibles']);
$router->add('GET', '/equipos/{id}', [EquiposController::class, 'show']);
$router->add('GET', '/incidencias', [IncidenciasController::class, 'index']);
$router->add('POST', '/incidencias', [IncidenciasController::class, 'store']);
$router->add('GET', '/incidencias/{id}', [IncidenciasController::class, 'show']);
$router->add('POST', '/incidencias/{id}/comentarios', [IncidenciasController::class, 'comentar']);
$router->add('GET', '/prestamos', [PrestamosController::class, 'index']);
$router->add('POST', '/prestamos', [PrestamosController::class, 'store']);
$router->add('POST', '/prestamos/{id}/rechazar', [PrestamosController::class, 'rechazar']);

// Personal de IT
$router->add('POST', '/equipos', [EquiposController::class, 'store'], $staff);
$router->add('PUT', '/equipos/{id}', [EquiposController::class, 'update'], $staff);
$router->add('PUT', '/incidencias/{id}', [IncidenciasController::class, 'update'], $staff);
$router->add('POST', '/incidencias/{id}/repuestos', [IncidenciasController::class, 'usarRepuesto'], $staff);
$router->add('POST', '/prestamos/{id}/aprobar', [PrestamosController::class, 'aprobar'], $staff);
$router->add('POST', '/prestamos/{id}/devolver', [PrestamosController::class, 'devolver'], $staff);
$router->add('GET', '/mantenimientos/plan', [MantenimientosController::class, 'plan'], $staff);
$router->add('GET', '/mantenimientos', [MantenimientosController::class, 'index'], $staff);
$router->add('POST', '/mantenimientos', [MantenimientosController::class, 'store'], $staff);
$router->add('GET', '/repuestos', [RepuestosController::class, 'index'], $staff);
$router->add('POST', '/repuestos', [RepuestosController::class, 'store'], $staff);
$router->add('PUT', '/repuestos/{id}', [RepuestosController::class, 'update'], $staff);
$router->add('POST', '/repuestos/{id}/ajustar', [RepuestosController::class, 'ajustar'], $staff);
$router->add('GET', '/usuarios/tecnicos', [UsuariosController::class, 'tecnicos'], $staff);
$router->add('GET', '/usuarios/activos', [UsuariosController::class, 'empleados'], $staff);

// Administrador
$router->add('GET', '/usuarios', [UsuariosController::class, 'index'], ['admin']);
$router->add('POST', '/usuarios', [UsuariosController::class, 'store'], ['admin']);
$router->add('PUT', '/usuarios/{id}', [UsuariosController::class, 'update'], ['admin']);

try {
    Auth::start();
    $router->dispatch(new Request());
} catch (HttpError $e) {
    Response::json(['error' => $e->getMessage(), 'campos' => $e->campos ?: null], $e->status);
} catch (PDOException $e) {
    error_log('[firulais] ' . $e->getMessage());
    if ($e->getCode() === '23000' && str_contains($e->getMessage(), 'Duplicate')) {
        Response::json(['error' => 'Ya existe un registro con ese código, email o número de serie.'], 409);
    } else {
        Response::json(['error' => APP_DEBUG ? $e->getMessage() : 'Error de base de datos. Intentá de nuevo en unos minutos.'], 500);
    }
} catch (Throwable $e) {
    error_log('[firulais] ' . $e);
    Response::json(['error' => APP_DEBUG ? $e->getMessage() : 'Error interno del servidor.'], 500);
}
