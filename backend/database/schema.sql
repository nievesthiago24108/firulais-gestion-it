-- FIRULAIS SRL · Gestión IT
-- Esquema para MariaDB 10.6+ / MySQL 8. Ejecutar completo: borra y recrea la base.

DROP DATABASE IF EXISTS firulais;
CREATE DATABASE firulais CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;
USE firulais;

-- Sectores (oficinas) del edificio según el plano de AutoCAD: planta 0 = Planta Baja.
CREATE TABLE sectores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  piso TINYINT NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  bocas_red SMALLINT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_sector (piso, nombre)
) ENGINE=InnoDB;

CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('admin','tecnico','empleado') NOT NULL DEFAULT 'empleado',
  sector_id INT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  intentos_fallidos TINYINT NOT NULL DEFAULT 0,
  bloqueado_hasta DATETIME NULL,
  creado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sector_id) REFERENCES sectores(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE equipos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  tipo ENUM('pc','notebook','servidor','impresora','switch','router','access_point','proyector','periferico') NOT NULL,
  marca VARCHAR(60) NOT NULL,
  modelo VARCHAR(80) NOT NULL,
  nro_serie VARCHAR(60) NULL UNIQUE,
  sector_id INT NOT NULL,
  asignado_a INT NULL,
  ip VARCHAR(45) NULL,
  anio_fabricacion SMALLINT NULL,
  estado ENUM('operativo','en_reparacion','en_prestamo','deposito','baja') NOT NULL DEFAULT 'operativo',
  prestable TINYINT(1) NOT NULL DEFAULT 0,
  ultimo_mantenimiento DATE NULL,
  proximo_mantenimiento DATE NULL,
  observaciones VARCHAR(500) NULL,
  creado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sector_id) REFERENCES sectores(id),
  FOREIGN KEY (asignado_a) REFERENCES usuarios(id) ON DELETE SET NULL,
  KEY ix_equipo_estado (estado),
  KEY ix_equipo_proximo (proximo_mantenimiento)
) ENGINE=InnoDB;

CREATE TABLE mantenimientos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipo_id INT NOT NULL,
  fecha DATE NOT NULL,
  tecnico_id INT NULL,
  tipo ENUM('preventivo','correctivo') NOT NULL DEFAULT 'preventivo',
  tareas VARCHAR(500) NOT NULL,
  observaciones VARCHAR(500) NULL,
  proximo DATE NULL,
  creado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE,
  FOREIGN KEY (tecnico_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE incidencias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipo_id INT NOT NULL,
  reportado_por INT NOT NULL,
  asignado_a INT NULL,
  componente ENUM('placa_madre','memoria','disco','red','video','fuente','drivers','pantallazo_azul',
                  'reinicio','perdida_datos','impresora','software','otro') NOT NULL,
  prioridad ENUM('critica','alta','media','baja') NOT NULL DEFAULT 'media',
  estado ENUM('abierta','en_reparacion','esperando_repuesto','resuelta','cerrada') NOT NULL DEFAULT 'abierta',
  titulo VARCHAR(120) NOT NULL,
  descripcion VARCHAR(1000) NOT NULL,
  solucion VARCHAR(1000) NULL,
  creada DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizada DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resuelta_en DATETIME NULL,
  FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE,
  FOREIGN KEY (reportado_por) REFERENCES usuarios(id),
  FOREIGN KEY (asignado_a) REFERENCES usuarios(id) ON DELETE SET NULL,
  KEY ix_incidencia_estado (estado)
) ENGINE=InnoDB;

CREATE TABLE incidencia_eventos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  incidencia_id INT NOT NULL,
  usuario_id INT NULL,
  tipo ENUM('creada','comentario','estado','asignacion','repuesto') NOT NULL,
  detalle VARCHAR(1000) NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (incidencia_id) REFERENCES incidencias(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE repuestos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  categoria ENUM('memoria','almacenamiento','fuente','red','video','placa_madre','refrigeracion',
                 'perifericos','insumos','cableado') NOT NULL,
  compatible_con VARCHAR(200) NULL,
  stock INT NOT NULL DEFAULT 0,
  stock_minimo INT NOT NULL DEFAULT 0,
  ubicacion VARCHAR(80) NULL,
  CHECK (stock >= 0)
) ENGINE=InnoDB;

CREATE TABLE incidencia_repuestos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  incidencia_id INT NOT NULL,
  repuesto_id INT NOT NULL,
  cantidad INT NOT NULL,
  usuario_id INT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (incidencia_id) REFERENCES incidencias(id) ON DELETE CASCADE,
  FOREIGN KEY (repuesto_id) REFERENCES repuestos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE prestamos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipo_id INT NOT NULL,
  solicitante_id INT NOT NULL,
  aprobado_por INT NULL,
  estado ENUM('pendiente','activo','devuelto','rechazado') NOT NULL DEFAULT 'pendiente',
  motivo VARCHAR(300) NOT NULL,
  destino VARCHAR(120) NULL,
  fecha_solicitud DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_entrega DATETIME NULL,
  fecha_limite DATETIME NOT NULL,
  fecha_devolucion DATETIME NULL,
  observaciones VARCHAR(300) NULL,
  FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE,
  FOREIGN KEY (solicitante_id) REFERENCES usuarios(id),
  FOREIGN KEY (aprobado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  KEY ix_prestamo_estado (estado)
) ENGINE=InnoDB;

-- Registro de auditoría: alimenta "Actividad reciente" del panel.
CREATE TABLE actividad (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  accion VARCHAR(200) NOT NULL,
  entidad ENUM('equipo','incidencia','mantenimiento','prestamo','repuesto','usuario') NOT NULL,
  entidad_id INT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  KEY ix_actividad_fecha (fecha)
) ENGINE=InnoDB;
