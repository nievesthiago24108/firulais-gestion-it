"""Genera backend/database/seed.sql con los datos de FIRULAIS SRL.

Las fechas se escriben relativas a NOW()/CURDATE(), así la demo siempre parece del día en que se carga.
Fuentes: cableado_red_edificio.xlsx (bocas por sector: 73 PCs + 13 impresoras en 4 plantas) y
presupuesto_firulais.xlsx (9 servidores, niveles de PC). Determinístico: misma salida en cada ejecución.
Uso: python3 tools/gen_seed.py
"""
import datetime as dt
import os
import random
import subprocess
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = dt.datetime(2026, 10, 27, 9, 0)
PASSWORD = 'firulais2026'
rnd = random.Random(2026)

# (piso, sector, bocas, impresoras, nivel de PC según Config_PCs)
SECTORES = [
    (0, 'Administración', 5, 1, 'B'), (0, 'Mesa de Entrada', 3, 1, 'A'), (0, 'Seguridad y Entrada', 1, 0, 'A'),
    (0, 'Archivo', 1, 0, 'A'), (0, 'Medicina Laboral', 3, 1, 'B'), (0, 'Despacho', 2, 0, 'B'),
    (0, 'Asuntos Laborales', 6, 1, 'B'), (0, 'Seguridad Entrada (der.)', 1, 0, 'A'),
    (1, 'Salón de Reuniones', 1, 0, 'C'), (1, 'Higiene y Seguridad', 3, 0, 'B'), (1, 'Planeamiento', 6, 1, 'D'),
    (1, 'Recepción', 1, 0, 'A'), (1, 'Director Comercial', 2, 0, 'C'), (1, 'Compras y Ventas', 3, 0, 'B'),
    (1, 'Contaduría', 3, 0, 'B'), (1, 'Departamento Cargas', 4, 1, 'B'), (1, 'Tesorería', 5, 1, 'B'),
    (2, 'Director de Informática', 1, 0, 'D'), (2, 'Dirección de Informática', 4, 0, 'D'),
    (2, 'Prensa y Difusión', 2, 0, 'E'), (2, 'Envíos a Nación', 3, 1, 'B'), (2, 'Redeterminaciones', 3, 1, 'B'),
    (2, 'Certificaciones', 2, 0, 'B'), (2, 'Director de Planificación', 1, 0, 'C'), (2, 'Asuntos Legales', 5, 1, 'B'),
    (3, 'Presidencia', 1, 0, 'C'), (3, 'Secretaría de Presidencia', 3, 1, 'C'), (3, 'Mesa de Entrada P3', 1, 0, 'A'),
    (3, 'Dirección de Obras', 6, 1, 'D'), (3, 'Ingeniero Jefe', 2, 0, 'D'), (3, 'Secretarios', 2, 1, 'B'),
    # áreas técnicas sin bocas de usuario en el plano
    (2, 'Sala de Servidores', 0, 0, None), (2, 'Depósito IT', 0, 0, None),
]
PISO = ['PB', 'P1', 'P2', 'P3']
PC_MODELO = {
    'A': ('Lenovo', 'ThinkCentre M70q Gen 4'), 'B': ('HP', 'ProDesk 400 G9 SFF'),
    'C': ('Dell', 'OptiPlex 7010 Plus'), 'D': ('HP', 'Z2 G9 Tower Workstation'), 'E': ('Dell', 'Precision 3660'),
}
SERVIDORES = [
    ('Servidor de virtualización (host principal)', 'Dell', 'PowerEdge R750', 'Proxmox VE'),
    ('Active Directory', 'Dell', 'PowerEdge R450', 'Windows Server 2022'),
    ('Samba (archivos)', 'HPE', 'ProLiant DL360 Gen10', 'Debian 12'),
    ('Correo electrónico', 'HPE', 'ProLiant DL360 Gen10', 'CentOS Stream 9'),
    ('FTP', 'Dell', 'PowerEdge R250', 'Debian 12'),
    ('Firewall', 'Dell', 'PowerEdge R250', 'IPCop'),
    ('VoIP', 'HPE', 'ProLiant DL20 Gen10', 'Asterisk / FreePBX'),
    ('Base de datos (clúster)', 'Dell', 'PowerEdge R650', 'Ubuntu Server + MariaDB'),
    ('Web (clúster)', 'Dell', 'PowerEdge R650', 'Ubuntu Server + NGINX + PHP'),
]
NOMBRES = ['Carla', 'Julián', 'Sofía', 'Mateo', 'Valentina', 'Tomás', 'Camila', 'Lucas', 'Martina', 'Joaquín',
           'Florencia', 'Agustín', 'Micaela', 'Nicolás', 'Paula', 'Santiago', 'Rocío', 'Facundo', 'Luciana', 'Ezequiel',
           'Brenda', 'Gonzalo', 'Daniela', 'Federico', 'Milagros', 'Ramiro', 'Antonella', 'Leandro', 'Josefina', 'Bruno']
APELLIDOS = ['Méndez', 'Ríos', 'Acosta', 'Benítez', 'Cáceres', 'Domínguez', 'Escobar', 'Figueroa', 'Godoy', 'Herrera',
             'Ibáñez', 'Juárez', 'Lagoria', 'Molina', 'Navarro', 'Ojeda', 'Pereyra', 'Quiroga', 'Romero', 'Sánchez',
             'Toledo', 'Urquiza', 'Vera', 'Villalba', 'Zárate', 'Calbucura', 'Cantero', 'Aguirre', 'Bustos', 'Correa']


def q(v):
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return '1' if v else '0'
    if isinstance(v, (int, float)):
        return str(v)
    # fechas relativas al momento de cargar el seed: la demo siempre se ve actual
    if isinstance(v, dt.datetime):
        minutos = round((BASE - v).total_seconds() / 60)
        return f'NOW() - INTERVAL {minutos} MINUTE' if minutos >= 0 else f'NOW() + INTERVAL {-minutos} MINUTE'
    if isinstance(v, dt.date):
        dias = (BASE.date() - v).days
        return f'CURDATE() - INTERVAL {dias} DAY' if dias >= 0 else f'CURDATE() + INTERVAL {-dias} DAY'
    return "'" + str(v).replace('\\', '\\\\').replace("'", "''") + "'"


def insert(tabla, filas):
    if not filas:
        return ''
    cols = list(filas[0])
    vals = ',\n'.join('(' + ', '.join(q(f[c]) for c in cols) + ')' for f in filas)
    return f'INSERT INTO {tabla} ({", ".join(cols)}) VALUES\n{vals};\n\n'


def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return ''.join(ch for ch in s if ch.isalnum())


def sigla(nombre):
    palabras = [p for p in nombre.replace('(', '').replace(')', '').split() if p.lower() not in ('de', 'y', 'a', 'del', 'la')]
    s = ''.join(p[0] for p in palabras).upper()
    return (s if len(s) >= 3 else slug(nombre)[:3].upper())[:4]


def add_months(d, m):
    y, mo = divmod(d.month - 1 + m, 12)
    return d.replace(year=d.year + y, month=mo + 1, day=min(d.day, 28))


def main():
    pw = subprocess.run(['php', '-r', f'echo password_hash("{PASSWORD}", PASSWORD_DEFAULT);'],
                        capture_output=True, text=True, check=True).stdout
    sectores, usuarios, equipos, mants = [], [], [], []
    sector_id = {}
    for i, (piso, nombre, bocas, *_rest) in enumerate(SECTORES, 1):
        sectores.append({'id': i, 'piso': piso, 'nombre': nombre, 'bocas_red': bocas})
        sector_id[nombre] = i
    informatica = sector_id['Dirección de Informática']

    def usuario(nombre, rol, sector, email=None):
        uid = len(usuarios) + 1
        email = email or f"{slug(nombre.split()[0])}.{slug(nombre.split()[-1])}@firulais.com.ar"
        while any(u['email'] == email for u in usuarios):
            email = email.replace('@', f'{uid}@')
        usuarios.append({'id': uid, 'nombre': nombre, 'email': email, 'password_hash': pw, 'rol': rol,
                         'sector_id': sector, 'creado': BASE - dt.timedelta(days=60)})
        return uid

    admin = usuario('Administrador IT', 'admin', informatica, 'admin@firulais.com.ar')
    tecnicos = [usuario('Lucía Ferreyra', 'tecnico', informatica, 'tecnico@firulais.com.ar'),
                usuario('Martín Gómez', 'tecnico', informatica), usuario('Diego Sosa', 'tecnico', informatica)]

    combos = [(n, a) for a in APELLIDOS for n in NOMBRES]
    rnd.shuffle(combos)

    def equipo(**f):
        f.setdefault('id', len(equipos) + 1)
        f.setdefault('asignado_a', None)
        f.setdefault('prestable', False)
        f.setdefault('estado', 'operativo')
        f.setdefault('observaciones', None)
        f.setdefault('ip', None)
        f['nro_serie'] = f.get('nro_serie') or f"{f['marca'][:2].upper()}{rnd.randint(10**7, 10**8 - 1)}"
        meses = 3 if f['tipo'] in ('servidor', 'switch', 'router', 'access_point') else 6
        ultimo = (BASE - dt.timedelta(days=rnd.randint(5, meses * 30 - 10))).date()
        f['ultimo_mantenimiento'], f['proximo_mantenimiento'] = ultimo, add_months(ultimo, meses)
        equipos.append(f)
        mants.append({'equipo_id': f['id'], 'fecha': ultimo, 'tecnico_id': rnd.choice(tecnicos), 'tipo': 'preventivo',
                      'tareas': 'Limpieza interna, control de temperatura, actualización de SO y antivirus'
                      if f['tipo'] in ('pc', 'notebook', 'servidor') else 'Limpieza, revisión de conexiones y firmware',
                      'observaciones': None, 'proximo': f['proximo_mantenimiento']})
        return f['id']

    empleado_demo = None
    usadas = set()
    for piso, nombre, bocas, impresoras, nivel in SECTORES:
        if not bocas:
            continue
        sid, sg = sector_id[nombre], sigla(nombre)
        while (piso, sg) in usadas:  # siglas repetidas en la misma planta: DIR, DIR2...
            sg = sg[:3] + str(len([u for u in usadas if u[0] == piso and u[1].startswith(sg[:3])]) + 1)
        usadas.add((piso, sg))
        marca, modelo = PC_MODELO[nivel]
        for n in range(1, bocas - impresoras + 1):
            nom, ape = combos.pop()
            uid = usuario(f'{nom} {ape}', 'empleado', sid,
                          'empleado@firulais.com.ar' if empleado_demo is None else None)
            empleado_demo = empleado_demo or uid
            equipo(codigo=f'PC-{PISO[piso]}-{sg}-{n:02d}', tipo='pc', marca=marca, modelo=modelo, sector_id=sid,
                   asignado_a=uid, ip=f'192.168.{20 + piso}.{len(equipos) + 20}',
                   anio_fabricacion=rnd.choice([2024, 2025, 2025, 2026, 2026]))
        for n in range(1, impresoras + 1):
            color = nivel in ('C', 'D')
            equipo(codigo=f'IMP-{PISO[piso]}-{sg}-{n:02d}', tipo='impresora', marca='HP',
                   modelo='Color LaserJet Pro M479fdw' if color else 'LaserJet Pro M404dn', sector_id=sid,
                   ip=f'192.168.{20 + piso}.{200 + len(equipos) % 50}', anio_fabricacion=rnd.choice([2024, 2025]))

    sala, deposito = sector_id['Sala de Servidores'], sector_id['Depósito IT']
    for i, (rol, marca, modelo, so) in enumerate(SERVIDORES, 1):
        equipo(codigo=f'SRV-{i:02d}', tipo='servidor', marca=marca, modelo=modelo, sector_id=sala,
               ip=f'192.168.10.{9 + i}', anio_fabricacion=2026, observaciones=f'{rol} · {so}')
    equipo(codigo='RTR-01', tipo='router', marca='MikroTik', modelo='RB4011iGS+', sector_id=sala, ip='192.168.1.1',
           anio_fabricacion=2025, observaciones='Router de borde · VLAN por planta')
    for piso in range(4):
        equipo(codigo=f'SW-{PISO[piso]}', tipo='switch', marca='Cisco', modelo='Catalyst 2960-X 48 puertos',
               sector_id=sector_id[next(s[1] for s in SECTORES if s[0] == piso)], ip=f'192.168.1.{2 + piso}',
               anio_fabricacion=2025, observaciones=f'Rack de planta · VLAN {20 + piso}')
        equipo(codigo=f'AP-{PISO[piso]}', tipo='access_point', marca='Ubiquiti', modelo='UniFi U6 Lite',
               sector_id=sector_id[next(s[1] for s in SECTORES if s[0] == piso)], ip=f'192.168.1.{10 + piso}',
               anio_fabricacion=2025)
    pool = {}
    for n in range(1, 7):
        pool[f'NB-{n:02d}'] = equipo(codigo=f'NB-{n:02d}', tipo='notebook', marca='Lenovo', modelo='ThinkPad E14 Gen 5',
                                     sector_id=deposito, estado='deposito', prestable=True, anio_fabricacion=2025)
    for n in range(1, 3):
        pool[f'PRY-{n:02d}'] = equipo(codigo=f'PRY-{n:02d}', tipo='proyector', marca='Epson', modelo='PowerLite E20',
                                      sector_id=deposito, estado='deposito', prestable=True, anio_fabricacion=2024)
    # algunos equipos con el mantenimiento vencido para el panel
    for e in rnd.sample([e for e in equipos if e['tipo'] in ('pc', 'impresora')], 9):
        e['proximo_mantenimiento'] = (BASE - dt.timedelta(days=rnd.randint(3, 40))).date()
        e['ultimo_mantenimiento'] = add_months(e['proximo_mantenimiento'], -6)
        mants[e['id'] - 1].update(fecha=e['ultimo_mantenimiento'], proximo=e['proximo_mantenimiento'])

    repuestos = [
        ('Memoria DDR4 8 GB 3200 MHz', 'memoria', 'HP ProDesk 400 G9, Lenovo M70q', 12, 6),
        ('Memoria DDR5 16 GB 4800 MHz', 'memoria', 'HP Z2 G9, Dell Precision 3660', 4, 4),
        ('SSD SATA 480 GB', 'almacenamiento', 'Todas las PCs', 9, 5),
        ('SSD NVMe M.2 1 TB', 'almacenamiento', 'Workstations, servidores', 2, 3),
        ('Disco HDD 1 TB 7200 rpm', 'almacenamiento', 'PCs de oficina', 6, 2),
        ('Fuente 500 W 80 Plus Bronze', 'fuente', 'PCs torre', 3, 2),
        ('Kit capacitores electrolíticos 1000 µF', 'fuente', 'Reparación de fuentes', 20, 10),
        ('Placa de red PCIe Gigabit Intel', 'red', 'Todas las PCs', 5, 3),
        ('Placa de video GT 1030 2 GB', 'video', 'PCs de oficina', 1, 2),
        ('Placa madre H610M (LGA1700)', 'placa_madre', 'HP ProDesk 400 G9', 1, 1),
        ('Pasta térmica Arctic MX-4', 'refrigeracion', 'CPU', 8, 3),
        ('Cooler CPU Intel original', 'refrigeracion', 'LGA1700', 2, 2),
        ('Patch cord UTP Cat6 1 m', 'cableado', 'Racks y puestos', 40, 20),
        ('Fichas RJ45 Cat6 (caja x100)', 'cableado', 'Cableado estructurado', 3, 2),
        ('Tóner HP 58A', 'insumos', 'HP LaserJet Pro M404dn', 2, 4),
        ('Mouse óptico USB', 'perifericos', 'Todos los puestos', 10, 5),
        ('Teclado USB español', 'perifericos', 'Todos los puestos', 7, 5),
    ]
    repuestos = [{'id': i, 'nombre': n, 'categoria': c, 'compatible_con': comp, 'stock': s, 'stock_minimo': m,
                  'ubicacion': 'Depósito IT · Estante ' + 'ABCD'[i % 4]}
                 for i, (n, c, comp, s, m) in enumerate(repuestos, 1)]

    pcs = [e for e in equipos if e['tipo'] == 'pc']
    impresoras = [e for e in equipos if e['tipo'] == 'impresora']
    incid, eventos, usos, actividad = [], [], [], []

    def log(uid, accion, entidad, eid, fecha):
        actividad.append({'usuario_id': uid, 'accion': accion, 'entidad': entidad, 'entidad_id': eid, 'fecha': fecha})

    casos = [  # (equipo, componente, prioridad, estado, título, descripción, horas atrás, repuesto usado, solución)
        (pcs[3], 'pantallazo_azul', 'critica', 'en_reparacion', 'Pantallazo azul al iniciar Windows',
         'Se reinicia con error MEMORY_MANAGEMENT apenas carga el escritorio.', 5, None, None),
        (pcs[11], 'disco', 'alta', 'esperando_repuesto', 'Disco con sectores dañados',
         'CrystalDiskInfo marca estado "Precaución" y el equipo tarda varios minutos en abrir archivos.', 30, None, None),
        (impresoras[2], 'impresora', 'media', 'abierta', 'Impresora sin tóner',
         'Imprime en blanco y el panel indica tóner bajo.', 3, None, None),
        (pcs[20], 'red', 'alta', 'abierta', 'Sin conexión a la red del dominio',
         'No obtiene IP; el LED de la placa de red no enciende.', 2, None, None),
        (pcs[27], 'fuente', 'critica', 'abierta', 'El equipo no enciende',
         'Olor a quemado en la fuente; no prende ningún LED.', 1, None, None),
        (pcs[33], 'drivers', 'baja', 'en_reparacion', 'Monitor secundario no detectado',
         'Después de la actualización de Windows no reconoce el segundo monitor.', 20, None, None),
        (pcs[40], 'memoria', 'alta', 'resuelta', 'Reinicios aleatorios',
         'Se reinicia varias veces por día; MemTest86 reporta errores.', 96, 1, 'Se reemplazó el módulo de RAM defectuoso.'),
        (pcs[45], 'perdida_datos', 'critica', 'resuelta', 'Borrado accidental de carpeta de proyectos',
         'Se eliminó la carpeta compartida de Planeamiento.', 140, None, 'Se restauró desde la copia de seguridad del servidor Samba.'),
        (pcs[52], 'video', 'media', 'cerrada', 'Artefactos en pantalla',
         'Líneas verticales al abrir AutoCAD.', 300, 9, 'Se cambió la placa de video y se actualizaron drivers.'),
        (pcs[8], 'reinicio', 'media', 'resuelta', 'Se apaga solo por temperatura',
         'Se apaga al trabajar más de una hora.', 200, 11, 'Limpieza interna y cambio de pasta térmica.'),
        (pcs[60], 'software', 'baja', 'abierta', 'Instalar MySQL Workbench',
         'Necesito MySQL Workbench para el sistema de certificaciones.', 26, None, None),
        (impresoras[7], 'impresora', 'baja', 'cerrada', 'Atasco de papel frecuente',
         'Se atasca en la bandeja 2.', 400, None, 'Se limpiaron rodillos de arrastre.'),
    ]
    for i, (eq, comp, prio, estado, titulo, desc, horas, rep, sol) in enumerate(casos, 1):
        creada = BASE - dt.timedelta(hours=horas)
        reporta = eq['asignado_a'] or rnd.choice([u['id'] for u in usuarios if u['rol'] == 'empleado'])
        tecnico = None if estado == 'abierta' else tecnicos[i % 3]
        resuelta = creada + dt.timedelta(hours=horas * 0.4) if estado in ('resuelta', 'cerrada') else None
        incid.append({'id': i, 'equipo_id': eq['id'], 'reportado_por': reporta, 'asignado_a': tecnico,
                      'componente': comp, 'prioridad': prio, 'estado': estado, 'titulo': titulo, 'descripcion': desc,
                      'solucion': sol, 'creada': creada, 'actualizada': resuelta or creada + dt.timedelta(minutes=40),
                      'resuelta_en': resuelta})
        eventos.append({'incidencia_id': i, 'usuario_id': reporta, 'tipo': 'creada', 'detalle': 'Incidencia reportada', 'fecha': creada})
        log(reporta, f'reportó la incidencia «{titulo}»', 'incidencia', i, creada)
        if tecnico:
            t = creada + dt.timedelta(minutes=35)
            nombre_tec = usuarios[tecnico - 1]['nombre']
            eventos.append({'incidencia_id': i, 'usuario_id': tecnico, 'tipo': 'asignacion',
                            'detalle': f'Asignada a {nombre_tec}', 'fecha': t})
            eventos.append({'incidencia_id': i, 'usuario_id': tecnico, 'tipo': 'estado',
                            'detalle': 'Estado: En reparación', 'fecha': t + dt.timedelta(minutes=5)})
            if estado in ('en_reparacion', 'esperando_repuesto'):
                eq['estado'] = 'en_reparacion'
            if estado == 'esperando_repuesto':
                eventos.append({'incidencia_id': i, 'usuario_id': tecnico, 'tipo': 'estado',
                                'detalle': 'Estado: Esperando repuesto — falta SSD NVMe 1 TB', 'fecha': t + dt.timedelta(hours=2)})
        if rep:
            usos.append({'incidencia_id': i, 'repuesto_id': rep, 'cantidad': 1, 'usuario_id': tecnico,
                         'fecha': resuelta - dt.timedelta(hours=1)})
            eventos.append({'incidencia_id': i, 'usuario_id': tecnico, 'tipo': 'repuesto',
                            'detalle': f"Se usó 1 × {repuestos[rep - 1]['nombre']}", 'fecha': resuelta - dt.timedelta(hours=1)})
        if resuelta:
            eventos.append({'incidencia_id': i, 'usuario_id': tecnico, 'tipo': 'estado',
                            'detalle': f'Estado: Resuelta — {sol}', 'fecha': resuelta})
            log(tecnico, f'resolvió la incidencia «{titulo}»', 'incidencia', i, resuelta)

    emp = [u['id'] for u in usuarios if u['rol'] == 'empleado']
    prest = []
    plan = [  # (equipo, solicitante, estado, motivo, destino, horas desde la solicitud, horas de plazo desde la entrega)
        ('NB-01', emp[0], 'activo', 'Capacitación de Active Directory en el Salón de Reuniones', 'Salón de Reuniones', 26, 48),
        ('NB-02', emp[5], 'activo', 'Relevamiento en obra', 'Dirección de Obras', 75, 48),
        ('PRY-01', emp[12], 'activo', 'Presentación del presupuesto anual', 'Salón de Reuniones', 4, 6),
        ('NB-03', emp[20], 'pendiente', 'Teletrabajo por licencia médica', 'Domicilio', 3, 72),
        ('NB-04', emp[31], 'pendiente', 'Auditoría externa de Contaduría', 'Contaduría', 1, 24),
        ('NB-05', emp[8], 'devuelto', 'Viaje a Nación con expedientes', 'Envíos a Nación', 240, 72),
        ('PRY-02', emp[3], 'devuelto', 'Reunión de directorio', 'Presidencia', 120, 4),
        ('NB-06', emp[14], 'rechazado', 'Uso personal', 'Domicilio', 50, 48),
    ]
    for i, (cod, sol, estado, motivo, destino, horas, plazo) in enumerate(plan, 1):
        pedido = BASE - dt.timedelta(hours=horas)
        entrega = pedido + dt.timedelta(minutes=30) if estado in ('activo', 'devuelto') else None
        limite = (entrega or pedido) + dt.timedelta(hours=plazo)
        devol = limite - dt.timedelta(hours=1) if estado == 'devuelto' else None
        aprobo = tecnicos[i % 3] if estado != 'pendiente' else None
        prest.append({'id': i, 'equipo_id': pool[cod], 'solicitante_id': sol, 'aprobado_por': aprobo, 'estado': estado,
                      'motivo': motivo, 'destino': destino, 'fecha_solicitud': pedido, 'fecha_entrega': entrega,
                      'fecha_limite': limite, 'fecha_devolucion': devol,
                      'observaciones': 'No corresponde a uso laboral' if estado == 'rechazado' else None})
        if estado == 'activo':
            equipos[pool[cod] - 1]['estado'] = 'en_prestamo'
        log(sol, f'solicitó el préstamo de {cod}', 'prestamo', i, pedido)
        if entrega:
            log(aprobo, f'entregó {cod} en préstamo', 'prestamo', i, entrega)
        if devol:
            log(aprobo, f'registró la devolución de {cod}', 'prestamo', i, devol)
    for m in mants[-12:]:
        log(m['tecnico_id'], f"registró mantenimiento preventivo de {equipos[m['equipo_id'] - 1]['codigo']}",
            'mantenimiento', m['equipo_id'], dt.datetime.combine(m['fecha'], dt.time(11, 0)))
    actividad.sort(key=lambda a: a['fecha'])

    out = ['-- Generado por tools/gen_seed.py — datos de ejemplo de FIRULAIS SRL.',
           f'-- Contraseña de todos los usuarios de ejemplo: {PASSWORD}', 'SET FOREIGN_KEY_CHECKS = 0;', '']
    out.append(insert('sectores', sectores))
    out.append(insert('usuarios', usuarios))
    out.append(insert('equipos', equipos))
    out.append(insert('mantenimientos', mants))
    out.append(insert('repuestos', repuestos))
    out.append(insert('incidencias', incid))
    out.append(insert('incidencia_eventos', eventos))
    out.append(insert('incidencia_repuestos', usos))
    out.append(insert('prestamos', prest))
    out.append(insert('actividad', actividad))
    out.append('SET FOREIGN_KEY_CHECKS = 1;\n')
    with open(os.path.join(ROOT, 'backend', 'database', 'seed.sql'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))
    tipos = {}
    for e in equipos:
        tipos[e['tipo']] = tipos.get(e['tipo'], 0) + 1
    print(f'{len(sectores)} sectores, {len(usuarios)} usuarios, {len(equipos)} equipos {tipos}')


main()
