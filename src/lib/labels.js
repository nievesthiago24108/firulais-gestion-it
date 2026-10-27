// Nombres legibles y tonos de color de los valores que maneja la API.
export const PISOS = ['Planta Baja', '1.ª Planta', '2.ª Planta', '3.ª Planta']
export const PISO_CORTO = ['PB', 'P1', 'P2', 'P3']

export const TIPOS = {
  pc: 'PC', notebook: 'Notebook', servidor: 'Servidor', impresora: 'Impresora', switch: 'Switch',
  router: 'Router', access_point: 'Access point', proyector: 'Proyector', periferico: 'Periférico',
}

export const ESTADO_EQUIPO = {
  operativo: ['Operativo', 'ok'], en_reparacion: ['En reparación', 'danger'], en_prestamo: ['En préstamo', 'info'],
  deposito: ['En depósito', 'accent'], baja: ['De baja', 'neutral'],
}

export const ESTADO_INCIDENCIA = {
  abierta: ['Abierta', 'warn'], en_reparacion: ['En reparación', 'accent'],
  esperando_repuesto: ['Esperando repuesto', 'info'], resuelta: ['Resuelta', 'ok'], cerrada: ['Cerrada', 'neutral'],
}

export const PRIORIDAD = {
  critica: ['Crítica', 'danger', 'Fuera de servicio, frena el trabajo'],
  alta: ['Alta', 'warn', 'Funciona con problemas graves'],
  media: ['Media', 'accent', 'Falla parcial o molesta'],
  baja: ['Baja', 'neutral', 'Consulta o detalle menor'],
}

export const COMPONENTES = {
  placa_madre: 'Placa madre', memoria: 'Memoria RAM', disco: 'Disco (HDD / SSD)', red: 'Placa de red / conexión',
  video: 'Placa de video / monitor', fuente: 'Fuente de alimentación', drivers: 'Controladores (drivers)',
  pantallazo_azul: 'Pantallazo azul', reinicio: 'Reinicios / se apaga', perdida_datos: 'Pérdida de datos',
  impresora: 'Impresora', software: 'Software / instalación', otro: 'Otro',
}

export const ESTADO_PRESTAMO = {
  pendiente: ['Pendiente', 'warn'], activo: ['Activo', 'accent'], demorado: ['Demorado', 'danger'],
  devuelto: ['Devuelto', 'ok'], rechazado: ['Rechazado', 'neutral'],
}

export const CATEGORIAS = {
  memoria: 'Memoria', almacenamiento: 'Almacenamiento', fuente: 'Fuentes', red: 'Red', video: 'Video',
  placa_madre: 'Placas madre', refrigeracion: 'Refrigeración', perifericos: 'Periféricos', insumos: 'Insumos',
  cableado: 'Cableado',
}

export const ROLES = {
  admin: ['Administrador', 'Acceso total, incluida la gestión de usuarios'],
  tecnico: ['Técnico', 'Gestiona equipos, incidencias, mantenimiento, préstamos y repuestos'],
  empleado: ['Empleado', 'Ve sus equipos, reporta fallas y pide préstamos'],
}

export const prestamoEstado = (p) => (p.estado === 'activo' && Number(p.demorado) ? 'demorado' : p.estado)
