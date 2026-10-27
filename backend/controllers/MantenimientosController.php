<?php
// controllers/MantenimientosController.php

class MantenimientosController
{
    public function plan(Request $req): void
    {
        Response::json((new MantenimientoModel())->plan());
    }

    public function index(Request $req): void
    {
        Response::json((new MantenimientoModel())->historial($_GET));
    }

    public function store(Request $req): void
    {
        $d = Validator::check($req->body(), [
            'equipo_id' => 'required|int:1',
            'fecha' => 'required|date',
            'tipo' => 'required|enum:preventivo,correctivo',
            'tareas' => 'required|string:500',
            'observaciones' => 'string:500',
            'proximo' => 'date',
        ]);
        $id = (new MantenimientoModel())->create($d);
        Response::json(['id' => $id] + (new EquipoModel())->find($d['equipo_id']), 201);
    }
}
