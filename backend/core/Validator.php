<?php
// core/Validator.php
// Valida y normaliza los datos que llegan del formulario.
// Reglas: required, string:max, int, int:min, enum:a,b,c, date, datetime, email, bool, ip.
// Ejemplo: Validator::check($datos, ['nombre' => 'required|string:120', 'piso' => 'int:0']);

class Validator
{
    public static function check(array $datos, array $reglas, bool $parcial = false): array
    {
        $limpio = [];
        $errores = [];
        foreach ($reglas as $campo => $definicion) {
            $reglasCampo = explode('|', $definicion);
            $presente = array_key_exists($campo, $datos);
            $valor = $presente ? $datos[$campo] : null;
            if (is_string($valor)) {
                $valor = trim($valor);
            }
            $vacio = $valor === null || $valor === '';
            if ($vacio) {
                if (in_array('required', $reglasCampo, true) && (!$parcial || $presente)) {
                    $errores[$campo] = 'Este campo es obligatorio.';
                } elseif ($presente) {
                    $limpio[$campo] = null;
                }
                continue;
            }
            foreach ($reglasCampo as $regla) {
                [$nombre, $arg] = array_pad(explode(':', $regla, 2), 2, null);
                $error = self::aplicar($nombre, $arg, $valor);
                if ($error) {
                    $errores[$campo] = $error;
                    break;
                }
            }
            if (!isset($errores[$campo])) {
                $limpio[$campo] = $valor;
            }
        }
        if ($errores) {
            throw new HttpError(422, 'Revisá los datos ingresados.', $errores);
        }
        return $limpio;
    }

    private static function aplicar(string $regla, ?string $arg, &$valor): ?string
    {
        switch ($regla) {
            case 'required':
                return null;
            case 'string':
                if (!is_scalar($valor)) {
                    return 'Valor inválido.';
                }
                $valor = (string) $valor;
                return ($arg && mb_strlen($valor) > (int) $arg) ? "Máximo $arg caracteres." : null;
            case 'int':
                if (filter_var($valor, FILTER_VALIDATE_INT) === false) {
                    return 'Debe ser un número entero.';
                }
                $valor = (int) $valor;
                return ($arg !== null && $valor < (int) $arg) ? "Debe ser mayor o igual a $arg." : null;
            case 'enum':
                return in_array($valor, explode(',', $arg), true) ? null : 'Opción no válida.';
            case 'date':
                $d = DateTime::createFromFormat('Y-m-d', (string) $valor);
                return ($d && $d->format('Y-m-d') === $valor) ? null : 'Fecha inválida.';
            case 'datetime':
                foreach (['Y-m-d\\TH:i', 'Y-m-d H:i', 'Y-m-d H:i:s', 'Y-m-d\\TH:i:s'] as $formato) {
                    $d = DateTime::createFromFormat($formato, (string) $valor);
                    if ($d && $d->format($formato) === $valor) {
                        $valor = $d->format('Y-m-d H:i:s');
                        return null;
                    }
                }
                return 'Fecha y hora inválidas.';
            case 'email':
                return filter_var($valor, FILTER_VALIDATE_EMAIL) ? null : 'Email inválido.';
            case 'ip':
                return filter_var($valor, FILTER_VALIDATE_IP) ? null : 'Dirección IP inválida.';
            case 'bool':
                $valor = filter_var($valor, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
                return null;
        }
        throw new LogicException("Regla desconocida: $regla");
    }
}
