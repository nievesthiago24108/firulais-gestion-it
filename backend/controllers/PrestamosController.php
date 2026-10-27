<?php
// controllers/PrestamosController.php

class PrestamosController
{
    private PrestamoModel $model;

    public function __construct()
    {
        $this->model = new PrestamoModel();
    }

    public function index(Request $req): void
    {
        $f = $_GET;
        if (!Auth::isStaff()) {
            $f['solicitante_id'] = Auth::id();
        }
        Response::json($this->model->list($f));
    }

    /** Empleado: crea una solicitud. Personal de IT: puede elegir solicitante y entregar en el acto. */
    public function store(Request $req): void
    {
        $body = $req->body();
        $d = Validator::check($body, [
            'equipo_id' => 'required|int:1',
            'motivo' => 'required|string:300',
            'destino' => 'string:120',
            'fecha_limite' => 'required|datetime',
            'solicitante_id' => 'int:1',
        ]);
        $entregar = Auth::isStaff() && !empty($body['entregar']);
        if (!Auth::isStaff() || empty($d['solicitante_id'])) {
            $d['solicitante_id'] = Auth::id();
        }
        $id = $this->model->create($d, $entregar);
        Response::json($this->model->find($id), 201);
    }

    public function aprobar(Request $req): void
    {
        $this->model->aprobar($req->id());
        Response::json($this->model->find($req->id()));
    }

    /** El personal de IT rechaza; el solicitante puede cancelar su propia solicitud pendiente. */
    public function rechazar(Request $req): void
    {
        $p = $this->model->find($req->id());
        $propio = (int) $p['solicitante_id'] === Auth::id();
        if (!Auth::isStaff() && !$propio) {
            throw new HttpError(403, 'No tenés permiso para cancelar este préstamo.');
        }
        $d = Validator::check($req->body(), ['motivo' => 'string:300']);
        $this->model->rechazar($req->id(), $d['motivo'] ?? null, !Auth::isStaff());
        Response::json($this->model->find($req->id()));
    }

    public function devolver(Request $req): void
    {
        $d = Validator::check($req->body(), ['observaciones' => 'string:300']);
        $this->model->devolver($req->id(), $d['observaciones'] ?? null);
        Response::json($this->model->find($req->id()));
    }
}
