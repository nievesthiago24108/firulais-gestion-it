<?php
// controllers/IncidenciasController.php

class IncidenciasController
{
    private const COMPONENTES = 'placa_madre,memoria,disco,red,video,fuente,drivers,pantallazo_azul,reinicio,perdida_datos,impresora,software,otro';

    private IncidenciaModel $model;

    public function __construct()
    {
        $this->model = new IncidenciaModel();
    }

    public function index(Request $req): void
    {
        $f = $_GET;
        if (!Auth::isStaff()) {
            $f['reportado_por'] = Auth::id();   // el empleado ve solo las que reportó
        }
        Response::json($this->model->list($f));
    }

    public function show(Request $req): void
    {
        $this->autorizarLectura($req->id());
        Response::json($this->model->find($req->id()));
    }

    public function store(Request $req): void
    {
        $d = Validator::check($req->body(), [
            'equipo_id' => 'required|int:1',
            'componente' => 'required|enum:' . self::COMPONENTES,
            'prioridad' => 'required|enum:critica,alta,media,baja',
            'titulo' => 'required|string:120',
            'descripcion' => 'required|string:1000',
        ]);
        $id = $this->model->create($d);
        Response::json($this->model->find($id), 201);
    }

    public function update(Request $req): void
    {
        $d = Validator::check($req->body(), [
            'asignado_a' => 'int:1',
            'prioridad' => 'enum:critica,alta,media,baja',
            'componente' => 'enum:' . self::COMPONENTES,
            'estado' => 'enum:abierta,en_reparacion,esperando_repuesto,resuelta,cerrada',
            'solucion' => 'string:1000',
        ], true);
        $this->model->update($req->id(), $d);
        Response::json($this->model->find($req->id()));
    }

    public function comentar(Request $req): void
    {
        $this->autorizarLectura($req->id());
        $d = Validator::check($req->body(), ['texto' => 'required|string:1000']);
        $this->model->comentar($req->id(), $d['texto']);
        Response::json($this->model->find($req->id()), 201);
    }

    public function usarRepuesto(Request $req): void
    {
        $d = Validator::check($req->body(), ['repuesto_id' => 'required|int:1', 'cantidad' => 'required|int:1']);
        $this->model->usarRepuesto($req->id(), $d['repuesto_id'], $d['cantidad']);
        Response::json($this->model->find($req->id()), 201);
    }

    private function autorizarLectura(int $id): void
    {
        if (!Auth::isStaff() && !$this->model->esDe($id, Auth::id())) {
            throw new HttpError(403, 'No tenés permiso para ver esta incidencia.');
        }
    }
}
