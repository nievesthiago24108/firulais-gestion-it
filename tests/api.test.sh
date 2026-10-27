#!/usr/bin/env bash
# Pruebas de la API contra una base recién cargada con los datos de ejemplo.
# Uso: tests/api.test.sh [url-base]   (por defecto http://127.0.0.1:8000/api)
# Requiere curl y jq. Recarga la base de desarrollo (tools/dev-db.sh reset) antes de empezar.
set -uo pipefail
API=${1:-http://127.0.0.1:8000/api}
DIR=$(mktemp -d)
ROOT=$(cd "$(dirname "$0")/.." && pwd)
pass=0 fail=0

"$ROOT/tools/dev-db.sh" reset >/dev/null

# req <sesion> <metodo> <ruta> [json] → deja el status en $S y el cuerpo en $B
req() {
  local jar="$DIR/$1.jar" csrf
  csrf=$(cat "$DIR/$1.csrf" 2>/dev/null || true)
  local out
  out=$(curl -s -w '\n%{http_code}' -b "$jar" -c "$jar" -X "$2" -H 'Content-Type: application/json' \
        -H "X-CSRF-Token: $csrf" ${4:+-d "$4"} "$API$3")
  S=${out##*$'\n'}
  B=${out%$'\n'*}
}
login() {
  req "$1" POST /auth/login "{\"email\":\"$2\",\"password\":\"firulais2026\"}"
  echo "$B" | jq -r .csrf > "$DIR/$1.csrf"
}
check() {  # check <descripcion> <condición-bash>
  if eval "$2"; then pass=$((pass + 1)); else fail=$((fail + 1)); echo "FALLA: $1 (status $S) $(echo "$B" | head -c 300)"; fi
}
j() { echo "$B" | jq -r "$1"; }

# --- Autenticación y permisos
req anon GET /dashboard;                               check 'sin sesión → 401' '[ "$S" = 401 ]'
req anon POST /auth/login '{"email":"admin@firulais.com.ar","password":"mal"}'
check 'contraseña incorrecta → 401' '[ "$S" = 401 ]'
login admin admin@firulais.com.ar;                     check 'login admin' '[ "$S" = 200 ] && [ "$(j .usuario.rol)" = admin ]'
login tec tecnico@firulais.com.ar;                     check 'login técnico' '[ "$(j .usuario.rol)" = tecnico ]'
login emp empleado@firulais.com.ar;                    check 'login empleado' '[ "$(j .usuario.rol)" = empleado ]'
EMP_ID=$(j .usuario.id)
req emp GET /usuarios;                                 check 'empleado no ve usuarios → 403' '[ "$S" = 403 ]'
req tec GET /usuarios;                                 check 'técnico no ve usuarios → 403' '[ "$S" = 403 ]'
req emp GET /repuestos;                                check 'empleado no ve repuestos → 403' '[ "$S" = 403 ]'
cp "$DIR/admin.csrf" "$DIR/admin.csrf.bak"; echo malo > "$DIR/admin.csrf"
req admin POST /repuestos '{"nombre":"x","categoria":"red","stock":1,"stock_minimo":0}'
check 'sin token CSRF → 419' '[ "$S" = 419 ]'
mv "$DIR/admin.csrf.bak" "$DIR/admin.csrf"

# --- Dashboard y listados
req admin GET /dashboard;                              check 'dashboard staff' '[ "$(j .kpi.equipos)" = 112 ]'
req emp GET /dashboard;                                check 'dashboard empleado' '[ "$(j .rol)" = empleado ] && [ "$(j ".equipos | length")" = 1 ]'
req emp GET /equipos;                                  check 'empleado ve solo su equipo' '[ "$(j length)" = 1 ]'
req admin GET '/equipos?tipo=servidor';                check 'filtro por tipo' '[ "$(j length)" = 9 ]'
req admin GET '/equipos?q=SRV-0';                      check 'búsqueda' '[ "$(j length)" = 9 ]'

# --- Equipos: alta, validación, duplicado, baja
req admin POST /equipos '{"codigo":"PC-TEST-01","tipo":"pc","marca":"HP","modelo":"ProDesk","sector_id":1,"estado":"operativo","ip":"999.1.1.1"}'
check 'IP inválida → 422' '[ "$S" = 422 ] && [ "$(j .campos.ip)" != null ]'
req admin POST /equipos '{"codigo":"PC-TEST-01","tipo":"pc","marca":"HP","modelo":"ProDesk","sector_id":1,"estado":"operativo"}'
check 'alta de equipo' '[ "$S" = 201 ]'; NUEVO=$(j .id)
req admin POST /equipos '{"codigo":"PC-TEST-01","tipo":"pc","marca":"HP","modelo":"ProDesk","sector_id":1,"estado":"operativo"}'
check 'código duplicado → 409' '[ "$S" = 409 ]'
req tec PUT "/equipos/$NUEVO" '{"estado":"baja"}';      check 'baja de equipo' '[ "$(j .estado)" = baja ]'
req emp PUT "/equipos/$NUEVO" '{"estado":"operativo"}'; check 'empleado no edita equipos → 403' '[ "$S" = 403 ]'

# --- Incidencias: flujo completo con repuesto
EQ=$(curl -s -b "$DIR/emp.jar" "$API/equipos" | jq '.[0].id')
req emp POST /incidencias "{\"equipo_id\":$EQ,\"componente\":\"memoria\",\"prioridad\":\"alta\",\"titulo\":\"Reinicios\",\"descripcion\":\"Se reinicia solo\"}"
check 'empleado reporta incidencia' '[ "$S" = 201 ] && [ "$(j .estado)" = abierta ]'; INC=$(j .id)
req emp PUT "/incidencias/$INC" '{"estado":"resuelta"}'; check 'empleado no cambia estado → 403' '[ "$S" = 403 ]'
req tec PUT "/incidencias/$INC" '{"estado":"en_reparacion"}'
check 'técnico toma la incidencia (se autoasigna)' '[ "$(j .estado)" = en_reparacion ] && [ "$(j .asignado_a)" != null ]'
req tec GET "/equipos/$EQ";                            check 'equipo pasa a en reparación' '[ "$(j .estado)" = en_reparacion ]'
req tec POST "/incidencias/$INC/repuestos" '{"repuesto_id":1,"cantidad":999}'
check 'stock insuficiente → 409' '[ "$S" = 409 ]'
req tec GET /repuestos; STOCK=$(j '.[] | select(.id==1) | .stock')
req tec POST "/incidencias/$INC/repuestos" '{"repuesto_id":1,"cantidad":1}'
check 'usar repuesto' '[ "$S" = 201 ] && [ "$(j ".repuestos | length")" = 1 ]'
req tec GET /repuestos;                                check 'stock descontado' '[ "$(j ".[] | select(.id==1) | .stock")" = $((STOCK - 1)) ]'
req tec PUT "/incidencias/$INC" '{"estado":"resuelta"}'; check 'resolver sin solución → 422' '[ "$S" = 422 ]'
req tec PUT "/incidencias/$INC" '{"estado":"resuelta","solucion":"Cambio de RAM"}'
check 'resolver incidencia' '[ "$(j .estado)" = resuelta ] && [ "$(j .resuelta_en)" != null ]'
req tec GET "/equipos/$EQ";                            check 'equipo vuelve a operativo' '[ "$(j .estado)" = operativo ]'
req emp POST "/incidencias/$INC/comentarios" '{"texto":"Gracias!"}'; check 'empleado comenta su incidencia' '[ "$S" = 201 ]'
req emp GET /incidencias/1;                            check 'empleado no ve incidencias ajenas → 403' '[ "$S" = 403 ]'

# --- Préstamos: solicitud, doble préstamo, aprobación, devolución
req emp GET /equipos/disponibles; NB=$(j '.[0].id'); NB_COD=$(j '.[0].codigo')
LIMITE=$(date -d '+2 days' '+%Y-%m-%dT%H:%M'); PASADO=$(date -d '-1 day' '+%Y-%m-%dT%H:%M')
req emp POST /prestamos "{\"equipo_id\":$NB,\"motivo\":\"Capacitación\",\"fecha_limite\":\"$PASADO\"}"
check 'fecha límite pasada → 422' '[ "$S" = 422 ]'
req emp POST /prestamos "{\"equipo_id\":$NB,\"motivo\":\"Capacitación\",\"fecha_limite\":\"$LIMITE\"}"
check 'empleado solicita préstamo' '[ "$S" = 201 ] && [ "$(j .estado)" = pendiente ]'; PR=$(j .id)
req admin POST /prestamos "{\"equipo_id\":$NB,\"motivo\":\"Otro\",\"fecha_limite\":\"$LIMITE\",\"entregar\":true}"
check "no se puede prestar $NB_COD dos veces → 409" '[ "$S" = 409 ]'
req emp POST "/prestamos/$PR/aprobar";                 check 'empleado no aprueba → 403' '[ "$S" = 403 ]'
req tec POST "/prestamos/$PR/aprobar";                 check 'aprobar préstamo' '[ "$(j .estado)" = activo ]'
req tec GET "/equipos/$NB";                            check 'equipo en préstamo' '[ "$(j .estado)" = en_prestamo ]'
req tec POST "/prestamos/$PR/aprobar";                 check 'aprobar dos veces → 409' '[ "$S" = 409 ]'
req tec POST "/prestamos/$PR/devolver" '{}';           check 'devolución' '[ "$(j .estado)" = devuelto ]'
req tec GET "/equipos/$NB";                            check 'equipo vuelve al depósito' '[ "$(j .estado)" = deposito ]'
req admin GET '/prestamos?estado=demorado';            check 'filtro demorados' '[ "$(j length)" = 1 ] && [ "$(j ".[0].demorado")" = 1 ]'
req emp POST /prestamos "{\"equipo_id\":$NB,\"motivo\":\"Otra vez\",\"fecha_limite\":\"$LIMITE\"}"; PR2=$(j .id)
req emp POST "/prestamos/$PR2/rechazar" '{}';          check 'empleado cancela su solicitud' '[ "$(j .estado)" = rechazado ]'

# --- Mantenimiento
HOY=$(date +%F)
req tec POST /mantenimientos "{\"equipo_id\":$EQ,\"fecha\":\"$HOY\",\"tipo\":\"preventivo\",\"tareas\":\"Limpieza\"}"
check 'registrar mantenimiento actualiza fechas' '[ "$S" = 201 ] && [ "$(j .ultimo_mantenimiento)" = "$HOY" ] && [ "$(j .proximo_mantenimiento)" = "$(date -d "$HOY +6 months" +%F)" ]'
req tec POST /mantenimientos "{\"equipo_id\":$EQ,\"fecha\":\"$(date -d tomorrow +%F)\",\"tipo\":\"preventivo\",\"tareas\":\"x\"}"
check 'mantenimiento con fecha futura → 422' '[ "$S" = 422 ]'
req tec GET /mantenimientos/plan;                      check 'plan de mantenimiento' '[ "$(j length)" -ge 100 ]'

# --- Repuestos y usuarios
req tec POST /repuestos/1/ajustar '{"delta":-9999,"motivo":"x"}'; check 'ajuste no deja stock negativo → 409' '[ "$S" = 409 ]'
req tec POST /repuestos/1/ajustar '{"delta":5,"motivo":"Compra"}'; check 'ingreso de stock' '[ "$S" = 200 ]'
req admin POST /usuarios '{"nombre":"Nuevo Técnico","email":"nuevo@firulais.com.ar","rol":"tecnico","password":"corta"}'
check 'contraseña corta → 422' '[ "$S" = 422 ]'
req admin POST /usuarios '{"nombre":"Nuevo Técnico","email":"nuevo@firulais.com.ar","rol":"tecnico","password":"segura2026"}'
check 'alta de usuario' '[ "$S" = 201 ]'
req admin PUT /usuarios/1 '{"activo":false}';          check 'admin no se deshabilita a sí mismo → 409' '[ "$S" = 409 ]'
req emp GET /dashboard >/dev/null
for _ in 1 2 3 4 5; do req bruto POST /auth/login '{"email":"tecnico@firulais.com.ar","password":"mal"}'; done
req bruto POST /auth/login '{"email":"tecnico@firulais.com.ar","password":"firulais2026"}'
check 'bloqueo tras 5 intentos fallidos → 429' '[ "$S" = 429 ]'
req admin POST /auth/logout;                           check 'logout' '[ "$S" = 200 ]'
req admin GET /dashboard;                              check 'después del logout → 401' '[ "$S" = 401 ]'

"$ROOT/tools/dev-db.sh" reset >/dev/null
rm -rf "$DIR"
echo "API: $pass correctas, $fail con fallas"
[ "$fail" = 0 ]
