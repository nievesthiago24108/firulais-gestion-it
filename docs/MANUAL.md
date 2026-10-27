# Manual de uso

Guía para usar **FIRULAIS · Gestión IT**, el sistema del área de Sistemas de FIRULAIS SRL. Está organizada por
tarea: buscá lo que necesitás hacer. Para saber cómo está construida la app, ver [ARQUITECTURA.md](ARQUITECTURA.md).

- [Entrar al sistema](#entrar-al-sistema)
- [La pantalla principal](#la-pantalla-principal)
- [Si sos empleado](#si-sos-empleado)
- [Si sos técnico](#si-sos-técnico)
- [Si sos administrador](#si-sos-administrador)
- [Preguntas frecuentes](#preguntas-frecuentes)

---

## Entrar al sistema

1. Abrí la dirección del sistema en el navegador. En la red de la empresa es **http://192.168.10.18/**; en una PC de
   pruebas con XAMPP, **http://localhost/firulais/public/**.
2. Escribí tu **email** y tu **contraseña** y tocá **Ingresar**.

Si te equivocás de contraseña 5 veces seguidas, la cuenta se bloquea 10 minutos. Esperá y volvé a intentar, o pedile
al administrador que te cambie la contraseña.

Para salir, tocá tu nombre (arriba a la derecha) y elegí **Cerrar sesión**. La sesión también se cierra al cerrar el
navegador o después de un rato sin usar el sistema; en ese caso te vuelve a pedir los datos.

**Usuarios de prueba** (contraseña `firulais2026` para los tres):

| Email | Rol |
|---|---|
| `admin@firulais.com.ar` | Administrador |
| `tecnico@firulais.com.ar` | Técnico |
| `empleado@firulais.com.ar` | Empleado |

---

## La pantalla principal

- **Menú lateral** (a la izquierda; en el celular se abre con el botón ☰): lleva a cada sección. Cada usuario ve
  solo las secciones que puede usar. Para el personal de Sistemas, los números al lado de cada sección indican
  cuántas cosas esperan atención (incidencias abiertas, mantenimientos vencidos, préstamos por entregar, repuestos
  para reponer).
- **Botón Reportar falla** (arriba): está disponible desde cualquier pantalla.
- **Buscador** (arriba, solo personal de Sistemas): escribí un código de equipo, una IP, un sector o el nombre de
  una persona y tocá Enter para ir al listado de equipos filtrado.
- **Tema claro / oscuro**: al pie del menú lateral. La elección queda guardada en ese navegador.

En las tablas podés tocar el título de una columna para ordenar, y tocar una fila para ver el detalle. En el
celular las tablas se muestran como tarjetas.

---

## Si sos empleado

Tu panel muestra **tus equipos**, **las fallas que reportaste** y **tus préstamos**.

### Reportar una falla

1. Tocá **Reportar falla** (en el panel o arriba en cualquier pantalla).
2. **Equipo:** elegí cuál falla. Si tenés una sola PC asignada, ya aparece elegida. También podés elegir los equipos
   compartidos de tu sector, como la impresora.
3. **Qué parte falla:** elegí la opción más parecida (no enciende la fuente, no hay internet, pantallazo azul,
   impresora…). Si no sabés, elegí **Otro**.
4. **Prioridad:** qué tanto te frena el trabajo.

   | Prioridad | Cuándo usarla |
   |---|---|
   | Crítica | El equipo está fuera de servicio y no podés trabajar |
   | Alta | Funciona con problemas graves |
   | Media | Falla parcial o molesta |
   | Baja | Consulta o detalle menor |

5. **Resumen:** una frase corta, por ejemplo «No enciende» o «Sin internet».
6. **Qué pasa:** desde cuándo, qué mensaje aparece y qué probaste.
7. Tocá **Enviar reporte**. Aparece un aviso con el **número de seguimiento** (por ejemplo, #13).

### Seguir una falla

Entrá a **Incidencias** (o tocá la falla en tu panel). Ahí ves en qué estado está:

| Estado | Qué significa |
|---|---|
| Abierta | Sistemas recibió el reporte y todavía no empezó a trabajar |
| En reparación | Un técnico la está atendiendo; el equipo figura en reparación |
| Esperando repuesto | Hace falta una pieza que todavía no está |
| Resuelta | Ya se solucionó; en el detalle está qué se hizo |
| Cerrada | Terminada, ya no admite cambios |

Al abrir una incidencia ves todo el historial y quién la atiende. Podés **escribir un comentario** (por ejemplo,
«volvió a pasar hoy a la mañana») y el técnico lo ve en el mismo historial.

### Pedir un préstamo

Sistemas presta notebooks y proyectores del depósito para capacitaciones, reuniones o trabajo fuera de la oficina.

1. Tocá **Pedir un préstamo** en el panel (o entrá a **Préstamos** → **Pedir préstamo**).
2. Elegí el **equipo** entre los disponibles.
3. Contá **para qué** lo necesitás, **dónde** se va a usar y **hasta cuándo** (fecha y hora de devolución).
4. Tocá **Enviar pedido**. El pedido queda **Pendiente** hasta que Sistemas te lo entregue.

Mientras esté pendiente lo podés **Cancelar** desde la lista de préstamos. Si Sistemas lo rechaza, vas a ver el
motivo. Cuando te lo entregan pasa a **Activo**; si se pasa la fecha de devolución figura como **Demorado**:
devolvelo cuanto antes en Sistemas.

### Ver tus equipos

En **Equipos** (aparece como «Mis equipos») ves los equipos asignados a vos. Tocá uno para ver sus datos, su
historial de fallas y de mantenimientos, y para reportarle una falla directamente.

---

## Si sos técnico

Tu panel muestra:

- **El edificio**, planta por planta (PB a P3), con cuántos equipos hay y cuántos están en reparación. Tocá una
  planta para ver sus equipos.
- **Para atender ahora**: la lista de pendientes, ordenada por urgencia. Primero las incidencias críticas, después
  los préstamos por entregar, las incidencias de prioridad alta, los mantenimientos vencidos, los repuestos para
  reponer y el resto de las incidencias. Dentro de cada prioridad aparecen primero las que no tienen técnico.
  Tocá un elemento para ir directo a resolverlo.
- **Actividad reciente**: quién hizo qué en el sistema.

### Atender una incidencia

1. Entrá a **Incidencias**. Las pestañas separan **Pendientes**, **Sin asignar**, **Asignadas a mí**,
   **En reparación**, **Resueltas** y **Todas**. Podés buscar por falla, equipo o persona.
2. Tocá la incidencia para abrir el detalle. En el bloque **Gestionar**:
   - **Técnico asignado:** tomala vos o asignásela a otro técnico. Hace falta un técnico para sacarla de *Abierta*.
   - **Prioridad:** ajustala si el empleado la marcó de más o de menos.
   - **Estado:** pasala a **En reparación** cuando empieces (el equipo queda marcado *en reparación*) o a
     **Esperando repuesto** si falta una pieza.
3. Tocá **Guardar cambios**. El cambio queda en el historial y el empleado lo ve.
4. **Si usaste un repuesto:** tocá **Registrar repuesto usado**, elegí cuál y la cantidad, y tocá
   **Descontar del stock**. Se descuenta en el momento; si no hay suficiente, el sistema no te deja.
5. **Para terminar:** elegí **Resuelta**, escribí la **Solución aplicada** (es obligatoria y queda en el historial
   del equipo) y guardá. El equipo vuelve a *operativo*.
6. Más adelante podés pasarla a **Cerrada**. Una incidencia cerrada ya no se puede modificar.

Podés comentar en cualquier momento para dejar notas o hacerle preguntas al empleado.

### Gestionar equipos

En **Equipos** está todo el inventario. Filtrá por **planta**, **sector**, **tipo** o **estado**, o buscá por código,
modelo, número de serie, IP o persona. **Limpiar filtros** vuelve a mostrar todo.

- **Nuevo equipo:** completá código (único, por ejemplo `PC-P1-CON-04`), tipo, marca, modelo, número de serie, año
  de fabricación, sector, a quién está asignado, IP, estado y fechas de mantenimiento. Marcá **Se puede prestar** si es un
  equipo del depósito que se puede prestar.
- **Detalle de un equipo:** tocá la fila. Ves sus datos y su historial de incidencias, mantenimientos y préstamos.
  Desde ahí podés **Reportar falla**, **Editar**, **Registrar mantenimiento** o **Dar de baja**.
- **Dar de baja:** el equipo deja de aparecer en el inventario activo, pero su historial se conserva. Para verlo,
  filtrá por estado *De baja*.
- **Exportar Excel:** descarga en `.xlsx` los equipos que estás viendo, con los filtros aplicados.

### Mantenimiento preventivo

Cada PC, notebook e impresora se revisa **cada 6 meses**; los servidores y los equipos de red (switch, router,
access point), **cada 3 meses**.

1. Entrá a **Mantenimiento**. Las pestañas muestran **Vencidos**, **Próximos 30 días**, **Al día** y **Todos**.
   Podés filtrar por planta y buscar por equipo, sector o persona.
2. En el equipo que revisaste, tocá **Registrar**.
3. Elegí **Preventivo** (revisión programada) o **Correctivo** (reparación de una falla).
4. Completá la **fecha** (hoy o antes; no se aceptan fechas futuras) y las **tareas realizadas** (limpieza, cambio
   de pasta térmica, actualización…). Las observaciones son opcionales.
5. **Próximo mantenimiento:** dejalo vacío y el sistema lo calcula solo (6 o 3 meses según el tipo de equipo), o
   poné una fecha si querés otra.
6. Tocá **Registrar mantenimiento**. El equipo pasa a *Al día*.

**Exportar planilla** descarga en Excel el registro de equipos con planta, sector, código, tipo, marca y modelo,
usuario, año de fabricación, último y próximo mantenimiento, días restantes y observaciones.

### Préstamos

En **Préstamos** las pestañas separan los pedidos por estado. Podés buscar por equipo, persona o motivo.

- **Entregar un pedido pendiente:** tocá **Entregar** y confirmá. El equipo queda *en préstamo* y empieza a contar
  la fecha de devolución.
- **Rechazar un pedido:** tocá la ✕, escribí el motivo (lo ve quien lo pidió) y confirmá.
- **Registrar una devolución:** en un préstamo activo o demorado, tocá **Registrar devolución**, anotá en qué estado
  vuelve (si trae todos los accesorios, si tiene daños) y confirmá. El equipo vuelve al depósito.
- **Prestar en el momento:** tocá **Nuevo préstamo**, elegí el equipo y la persona en **Se le presta a**, completá
  para qué, dónde y hasta cuándo, y tocá **Registrar y entregar**.

Un equipo que ya está prestado no aparece entre los disponibles: no se puede prestar dos veces.

### Repuestos

En **Repuestos** ves el stock de piezas con una barra que compara la cantidad con el mínimo:

| Etiqueta | Significa |
|---|---|
| OK | Hay más que el mínimo |
| Reponer | Está en el mínimo o por debajo |
| Sin stock | No queda ninguno |

- La pestaña **Para reponer** muestra solo los que hay que comprar.
- **Ajustar stock:** elegí **Ingreso** (compra, devolución) o **Retiro** (uso fuera de una incidencia, rotura), la
  cantidad y el motivo. El motivo es obligatorio y queda registrado.
- **Nuevo repuesto:** nombre, categoría, ubicación, con qué equipos es compatible, stock inicial y stock mínimo.
- **Editar** (ícono de lápiz): cambia los datos del repuesto. El stock no se edita a mano; se cambia solo con
  ajustes o al usarlo en una incidencia, así siempre queda registrado por qué cambió.
- **Exportar Excel:** incluye una columna con cuántos comprar para volver al doble del mínimo.

---

## Si sos administrador

Podés hacer todo lo del técnico y, además, gestionar quién entra al sistema desde **Usuarios**.

- Las pestañas filtran por rol; el buscador encuentra por nombre, email o sector.
- **Nuevo usuario:** nombre y apellido, email (no se puede repetir), sector, contraseña (mínimo 8 caracteres) y rol:

  | Rol | Puede |
  |---|---|
  | Empleado | Ver sus equipos, reportar fallas y pedir préstamos |
  | Técnico | Gestionar equipos, incidencias, mantenimiento, préstamos y repuestos |
  | Administrador | Todo lo anterior, más la gestión de usuarios |

- **Editar:** cambiá cualquier dato. Para cambiar la contraseña, escribí una nueva; si dejás el campo vacío, se
  mantiene la actual.
- **Quitar el acceso:** destildá **Puede ingresar al sistema**. El usuario no puede iniciar sesión, pero sus datos e
  historial se conservan. Para devolverle el acceso, volvé a tildarlo.

Por seguridad no podés quitarte a vos mismo el rol de administrador ni bloquear tu propia cuenta.

---

## Preguntas frecuentes

**No me deja entrar.** Revisá el email y la contraseña. Si aparece «Demasiados intentos fallidos», esperá los
minutos que indica. Si dice «Tu usuario está deshabilitado», hablá con el administrador.

**Un botón o una sección que nombra este manual no me aparece.** Cada rol ve solo lo que puede usar. Si necesitás
más permisos, pedíselo al administrador.

**El formulario no se envía.** Los campos con asterisco (*) son obligatorios. Si falta algo o hay un dato inválido,
el mensaje aparece en rojo debajo del campo.

**Mi equipo no aparece al reportar una falla.** La lista muestra los equipos asignados a vos y los compartidos de tu
sector. Si falta uno, avisale a Sistemas para que lo asigne.

**No puedo pedir un préstamo porque no hay equipos disponibles.** Todos los equipos prestables están en uso o
reservados. Probá más tarde o consultá en Sistemas cuándo vuelve alguno.

**Apareció «Tu sesión expiró».** Pasó un rato sin actividad o se cerró el navegador. Volvé a ingresar; lo que ya habías guardado no se
pierde.

**¿Funciona en el celular?** Sí. El menú se abre con el botón ☰ y las tablas se ven como tarjetas.
