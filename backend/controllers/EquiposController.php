<?php
// controllers/EquiposController.php

class EquiposController
{
    private const REGLAS = [
        'codigo' => 'required|string:30',
        'tipo' => 'required|enum:pc,notebook,servidor,impresora,switch,router,access_point,proyector,periferico',
        'marca' => 'required|string:60',
        'modelo' => 'required|string:80',
        'nro_serie' => 'string:60',
        'sector_id' => 'required|int:1',
        'asignado_a' => 'int:1',
        'ip' => 'ip',
        'anio_fabricacion' => 'int:1990',
        'estado' => 'required|enum:operativo,en_reparacion,en_prestamo,deposito,baja',
        'prestable' => 'bool',
        'ultimo_mantenimiento' => 'date',
        'proximo_mantenimiento' => 'date',
        'observaciones' => 'string:500',
    ];

    private EquipoModel $model;

    public function __construct()
    {
        $this->model = new EquipoModel();
    }

    public function index(Request $req): void
    {
        $f = $_GET;
        if (!Auth::isStaff()) {
            // el empleado ve sus equipos; para reportar fallas, también los compartidos de su sector
            $f = !empty($_GET['para_reporte'])
                ? ['reportables_de' => Auth::id(), 'sector_de' => Auth::user()['sector_id']]
                : ['asignado_a' => Auth::id()];
        }
        Response::json($this->model->list($f));
    }

    public function show(Request $req): void
    {
        $e = $this->model->find($req->id());
        if (!Auth::isStaff() && (int) $e['asignado_a'] !== Auth::id()) {
            throw new HttpError(403, 'No tenés permiso para ver este equipo.');
        }
        Response::json($e + ['historial' => $this->model->historial($req->id())]);
    }

    public function disponibles(Request $req): void
    {
        Response::json($this->model->disponibles());
    }

    public function store(Request $req): void
    {
        $d = Validator::check($req->body(), self::REGLAS);
        $id = $this->model->create($d);
        ActividadModel::log("dio de alta el equipo {$d['codigo']}", 'equipo', $id);
        Response::json($this->model->find($id), 201);
    }

    public function update(Request $req): void
    {
        $d = Validator::check($req->body(), self::REGLAS, true);
        $this->model->update($req->id(), $d);
        $e = $this->model->find($req->id());
        ActividadModel::log(($d['estado'] ?? '') === 'baja' ? "dio de baja el equipo {$e['codigo']}" : "editó el equipo {$e['codigo']}", 'equipo', $req->id());
        Response::json($e);
    }
}
