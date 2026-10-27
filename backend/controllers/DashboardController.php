<?php
// controllers/DashboardController.php
// Panel principal: indicadores para el personal de IT o resumen personal para el empleado.

class DashboardController
{
    public function index(Request $req): void
    {
        Response::json(Auth::isStaff() ? $this->staff() : $this->empleado());
    }

    private function staff(): array
    {
        $kpi = (new DashboardModel())->kpis();
        $incidencias = new IncidenciaModel();
        return [
            'rol' => 'staff',
            'kpi' => $kpi,
            'equipos_por_piso' => (new EquipoModel())->porPiso(),
            'incidencias_por_prioridad' => $incidencias->porPrioridad(),
            'incidencias_recientes' => array_slice(array_values(array_filter(
                $incidencias->list(),
                fn($i) => !in_array($i['estado'], ['resuelta', 'cerrada'], true)
            )), 0, 6),
            'prestamos_pendientes' => (new PrestamoModel())->list(['estado' => 'pendiente']),
            'mantenimientos_vencidos' => array_slice(array_values(array_filter(
                (new MantenimientoModel())->plan(),
                fn($e) => $e['dias_restantes'] !== null && $e['dias_restantes'] < 0
            )), 0, 6),
            'repuestos_bajo_stock' => (new RepuestoModel())->list(['bajo_stock' => 1]),
            'actividad' => (new ActividadModel())->recientes(8),
        ];
    }

    private function empleado(): array
    {
        $yo = Auth::id();
        return [
            'rol' => 'empleado',
            'equipos' => (new EquipoModel())->list(['asignado_a' => $yo]),
            'incidencias' => (new IncidenciaModel())->list(['reportado_por' => $yo]),
            'prestamos' => (new PrestamoModel())->list(['solicitante_id' => $yo]),
        ];
    }
}
