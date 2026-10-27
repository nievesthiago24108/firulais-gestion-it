<?php
// controllers/SectoresController.php

class SectoresController
{
    public function index(Request $req): void
    {
        Response::json((new SectorModel())->list());
    }
}
