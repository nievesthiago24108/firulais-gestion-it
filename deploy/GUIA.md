# Guía de instalación

La app compilada ya está dentro de `backend/public/`. Lo que se instala en el servidor es la carpeta `backend/`.

## Opción A · XAMPP (Windows, pruebas locales — punto 17.f)

1. Instalar XAMPP con PHP 8.3 o superior. En `php.ini` verificar que esté activa `extension=pdo_mysql`.
2. Iniciar **Apache** y **MySQL** desde el panel de XAMPP.
3. Abrir `http://localhost/phpmyadmin` → pestaña **Importar**:
   1. `backend/database/schema.sql` (crea la base `firulais`)
   2. `backend/database/seed.sql` con la base `firulais` seleccionada (datos de ejemplo)
4. Copiar la carpeta `backend` a `C:\xampp\htdocs\firulais`.
5. Entrar a **http://localhost/firulais/public/** con `admin@firulais.com.ar` / `firulais2026`.

XAMPP usa `root` sin contraseña, que son los valores por defecto de `config/config.php`. Los archivos `.htaccess`
ya incluidos hacen que solo `public/` sea accesible y que `/api/...` llegue al front controller
(requiere `mod_rewrite`, activo por defecto en XAMPP).

## Opción B · Ubuntu Server + NGINX + PHP-FPM + MariaDB (punto 15)

Plan de IP del proyecto: servidor web SRV-09 `192.168.10.18`, base de datos SRV-08 `192.168.10.17`.
Los comandos se ejecutan por SSH (PuTTY desde Windows).

### 1. Servidor de base de datos (SRV-08)

```bash
sudo apt update && sudo apt install -y mariadb-server
sudo mysql_secure_installation
# escuchar en la red interna: bind-address = 192.168.10.17
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf && sudo systemctl restart mariadb

sudo mysql < schema.sql
sudo mysql firulais < seed.sql
sudo mysql -e "CREATE USER 'firulais'@'192.168.10.18' IDENTIFIED BY 'una-clave-segura';
               GRANT SELECT, INSERT, UPDATE, DELETE ON firulais.* TO 'firulais'@'192.168.10.18';"
sudo ufw allow from 192.168.10.18 to any port 3306
```

### 2. Servidor web (SRV-09)

```bash
sudo apt update && sudo apt install -y nginx php8.3-fpm php8.3-mysql
sudo mkdir -p /var/www/firulais
sudo cp -r backend /var/www/firulais/            # queda /var/www/firulais/backend/public
sudo chown -R www-data:www-data /var/www/firulais

sudo cp nginx-firulais.conf /etc/nginx/sites-available/firulais
sudo nano /etc/nginx/sites-available/firulais     # poner la clave real en DB_PASS
sudo ln -s /etc/nginx/sites-available/firulais /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo ufw allow 'Nginx HTTP'
```

Entrar desde un cliente a **http://192.168.10.18/**.

### 3. Pruebas del servidor web con la aplicación (punto 15.i)

Desde una máquina con el proyecto y Node.js:

```bash
tests/api.test.sh http://192.168.10.18/api        # ⚠️ recarga la base: usar solo en el entorno de prueba
node tests/e2e/flujos.mjs http://192.168.10.18/
```

Estas mismas pruebas se corrieron contra NGINX 1.30 + PHP-FPM con esta configuración: 53/53 y 27/27 correctas.

### Notas de producción

- Para HTTPS (recomendado): `sudo apt install certbot python3-certbot-nginx` y `sudo certbot --nginx`.
  La cookie de sesión se marca como segura automáticamente cuando la conexión es HTTPS.
- Los errores de PHP se registran en el log de PHP-FPM; la API nunca muestra detalles internos al usuario
  (salvo con `APP_DEBUG=1`, solo para desarrollo).
- Copias de seguridad de la base (punto 5): `mysqldump firulais > firulais-$(date +%F).sql` programado con cron.
