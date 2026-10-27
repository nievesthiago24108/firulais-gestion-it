<?php
// models/DashboardModel.php
// Indicadores del panel principal en una sola consulta.

class DashboardModel extends Model
{
    public function kpis(): array
    {
        return array_map('intval', $this->one(
            'SELECT
               (SELECT COUNT(*) FROM equipos WHERE estado <> "baja") AS equipos,
               (SELECT COUNT(*) FROM equipos WHERE estado = "operativo") AS operativos,
               (SELECT COUNT(*) FROM equipos WHERE estado = "en_reparacion") AS en_reparacion,
               (SELECT COUNT(*) FROM incidencias WHERE estado NOT IN ("resuelta", "cerrada")) AS incidencias_abiertas,
               (SELECT COUNT(*) FROM incidencias WHERE estado NOT IN ("resuelta", "cerrada") AND prioridad = "critica") AS incidencias_criticas,
               (SELECT COUNT(*) FROM incidencias WHERE estado = "abierta" AND asignado_a IS NULL) AS sin_asignar,
               (SELECT COUNT(*) FROM equipos WHERE estado <> "baja" AND proximo_mantenimiento < CURDATE()) AS mantenimientos_vencidos,
               (SELECT COUNT(*) FROM equipos WHERE estado <> "baja" AND proximo_mantenimiento BETWEEN CURDATE() AND CURDATE() + INTERVAL 30 DAY) AS mantenimientos_proximos,
               (SELECT COUNT(*) FROM prestamos WHERE estado = "activo") AS prestamos_activos,
               (SELECT COUNT(*) FROM prestamos WHERE estado = "activo" AND fecha_limite < NOW()) AS prestamos_demorados,
               (SELECT COUNT(*) FROM prestamos WHERE estado = "pendiente") AS prestamos_pendientes,
               (SELECT COUNT(*) FROM repuestos WHERE stock <= stock_minimo) AS repuestos_bajo_stock'
        ));
    }
}
