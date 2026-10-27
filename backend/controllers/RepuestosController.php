<?php
// controllers/RepuestosController.php

class RepuestosController
{
    private const REGLAS = [
        'nombre' => 'required|string:120',
        'categoria' => 'required|enum:memoria,almacenamiento,fuente,red,video,placa_madre,refrigeracion,perifericos,insumos,cableado',
        'compatible_con' => 'string:200',
        'stock' => 'required|int:0',
        'stock_minimo' => 'required|int:0',
        'ubicacion' => 'string:80',
    ];

    public function index(Request $req): void
    {
        Response::json((new RepuestoModel())->list($_GET));
    }

    public function store(Request $req): void
    {
        $model = new RepuestoModel();
        $id = $model->create(Validator::check($req->body(), self::REGLAS));
        Response::json($this->buscar($id), 201);
    }

    /** El stock no se edita directo: se usa "ajustar" para que quede registrado. */
    public function update(Request $req): void
    {
        $reglas = self::REGLAS;
        unset($reglas['stock']);
        (new RepuestoModel())->update($req->id(), Validator::check($req->body(), $reglas, true));
        Response::json($this->buscar($req->id()));
    }

    public function ajustar(Request $req): void
    {
        $d = Validator::check($req->body(), ['delta' => 'required|int', 'motivo' => 'required|string:120']);
        if ($d['delta'] === 0) {
            throw new HttpError(422, 'Revisá los datos ingresados.', ['delta' => 'La cantidad no puede ser cero.']);
        }
        Response::json((new RepuestoModel())->ajustar($req->id(), $d['delta'], $d['motivo']));
    }

    private function buscar(int $id): array
    {
        foreach ((new RepuestoModel())->list() as $r) {
            if ((int) $r['id'] === $id) {
                return $r;
            }
        }
        throw new HttpError(404, 'Repuesto no encontrado.');
    }
}
