<?php
// controllers/UsuariosController.php
// Administración de usuarios (solo administrador) y listados auxiliares.

class UsuariosController
{
    private const REGLAS = [
        'nombre' => 'required|string:120',
        'email' => 'required|email',
        'rol' => 'required|enum:admin,tecnico,empleado',
        'sector_id' => 'int:1',
        'activo' => 'bool',
        'password' => 'string:200',
    ];

    public function index(Request $req): void
    {
        Response::json((new UsuarioModel())->list($_GET));
    }

    /** Técnicos activos, para asignar incidencias. */
    public function tecnicos(Request $req): void
    {
        $todos = (new UsuarioModel())->list(['activos' => true]);
        Response::json(array_values(array_filter($todos, fn($u) => $u['rol'] !== 'empleado')));
    }

    /** Empleados activos, para registrar préstamos a su nombre. */
    public function empleados(Request $req): void
    {
        Response::json((new UsuarioModel())->list(['activos' => true]));
    }

    public function store(Request $req): void
    {
        $d = Validator::check($req->body(), self::REGLAS);
        $this->validarPassword($d['password'] ?? '', true);
        $id = (new UsuarioModel())->create($d);
        ActividadModel::log("creó el usuario {$d['nombre']}", 'usuario', $id);
        Response::json((new UsuarioModel())->find($id), 201);
    }

    public function update(Request $req): void
    {
        $d = Validator::check($req->body(), self::REGLAS, true);
        if ($req->id() === Auth::id() && ((isset($d['rol']) && $d['rol'] !== 'admin') || (isset($d['activo']) && !$d['activo']))) {
            throw new HttpError(409, 'No podés quitarte el rol de administrador ni deshabilitar tu propio usuario.');
        }
        if (!empty($d['password'])) {
            $this->validarPassword($d['password'], false);
        }
        $model = new UsuarioModel();
        $model->find($req->id());
        $model->update($req->id(), $d);
        ActividadModel::log("editó el usuario {$model->find($req->id())['nombre']}", 'usuario', $req->id());
        Response::json($model->find($req->id()));
    }

    private function validarPassword(string $password, bool $obligatoria): void
    {
        if (($obligatoria || $password !== '') && mb_strlen($password) < 8) {
            throw new HttpError(422, 'Revisá los datos ingresados.', ['password' => 'Mínimo 8 caracteres.']);
        }
    }
}
