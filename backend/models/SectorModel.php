<?php
// models/SectorModel.php

class SectorModel extends Model
{
    public function list(): array
    {
        return $this->all(
            'SELECT s.*, (SELECT COUNT(*) FROM equipos e WHERE e.sector_id = s.id AND e.estado <> "baja") AS equipos
             FROM sectores s ORDER BY s.piso, s.nombre'
        );
    }
}
