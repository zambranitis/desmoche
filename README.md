# Desmoche Nica — Multijugador web (2.0 beta)
**Realizado por Ricardo Zambrana** · Juego tradicional de Nicaragua.

Juego web 9:16 para **2, 3 o 4 personas reales**, accesible desde el navegador del teléfono, sin cuentas ni instalaciones. Este paquete es una aplicación completa con servidor Node.js: **no funciona como multijugador si sólo se sube `index.html` a Netlify Drop**.

## Qué recibe el jugador

1. Abre `https://TU-DOMINIO.onrender.com`.
2. Escribe su nombre y pulsa **CREAR UNA MESA**.
3. Pulsa **COMPARTIR INVITACIÓN** por WhatsApp o copia el enlace.
4. Los invitados abren el enlace, escriben su nombre y pulsan **ENTRAR A LA SALA**.
5. Con 2–4 personas presentes, quien creó la sala pulsa **COMENZAR PARTIDA**.
6. Cada teléfono recibe **únicamente su propia mano**. Las cartas de la mesa y el descarte se ven en todos los dispositivos.

Los invitados no tienen que instalar aplicaciones, introducir contraseñas ni registrarse. La URL de invitación lleva un código de sala, por ejemplo: `https://tu-juego.onrender.com/sala?room=ABC234`.

## PUBLICARLO: GUÍA PARA PRINCIPIANTES

### PASO 1. Subir el código a GitHub

1. Creá una cuenta en https://github.com/ si no la tenés.
2. Entrá a https://github.com/new y creá un repositorio nuevo llamado `desmoche-nica-online`.
3. Dentro del repositorio, usá **Add file → Upload files**. Arrastrá **el contenido descomprimido** de este ZIP, incluyendo `server.js`, `render.yaml`, `package.json`, la carpeta `public`, la carpeta `server` y la carpeta `tests`. Debe quedar `server.js` en la raíz del repositorio, no dentro de otra carpeta anidada.
4. Confirmá con **Commit changes**. **No subás únicamente el ZIP**: Render necesita los archivos descomprimidos.

### PASO 2. Crear el alojamiento en Render (la ruta más corta)

1. Abrí https://dashboard.render.com/ y creá tu cuenta si aún no tenés una.
2. Elegí **New → Blueprint**.
3. Conectá tu GitHub, seleccioná el repositorio `desmoche-nica-online` y dejá **Blueprint Path: `render.yaml`**.
4. Revisá el servicio web que Render propone y aprobá su despliegue; el archivo `render.yaml` ya configura el servidor Node y el plan Free de pruebas.
5. Esperá a que Render muestre **Live** y copiá la dirección pública **HTTPS** que termina en `.onrender.com`. **Ese es tu enlace del juego.**
6. Abrilo en tu celular: creá una sala, compartí la invitación por WhatsApp y pedile a un amigo que entre desde otro teléfono.

Si preferís no usar Blueprints, también funciona **New → Web Service** con el mismo repositorio: lenguaje Node, comando de compilación `npm install`, comando de arranque `npm start` y plan Free.

> Render puede cambiar ligeramente los nombres de sus botones y servicios. Nunca elijas **Static Site**: necesitás el servidor de juego.

### PASO 3. Comprobar que está online

Visitá `https://TU-DOMINIO.onrender.com/health`. Si aparece un JSON parecido a `{"ok":true,"rooms":0,"version":"2.0"}`, el servidor está funcionando.

Para actualizar el juego después, sustituí los archivos en GitHub: Render redeplegará automáticamente la nueva versión si mantenés el despliegue automático habilitado.

## Cómo ejecutarlo en tu computadora (opcional)

1. Instalá Node.js 20 o superior.
2. Abrí una terminal en la carpeta extraída.
3. Ejecutá `npm start`.
4. Entrá a `http://localhost:3000`.
5. Para ejecutar las pruebas: `npm test`.

**No hay librerías que instalar.** El servidor utiliza exclusivamente módulos incorporados en Node.js y actualiza los teléfonos mediante eventos SSE (EventSource) y acciones HTTPS.

## Incluye

- 2 a 4 jugadores humanos por sala; invitación por enlace o código de 6 caracteres.
- Cambio simultáneo sin enseñar las cartas de otro participante.
- Mazo barajado y administrado por el servidor.
- Turnos y estados en tiempo real; descartes, reclamos y prioridades por orden de juego.
- Combinaciones, escaleras, ternas, desmoche, pago y cierre con 10 cartas sin pagar.
- Incorporación obligatoria, descalificación y pagos aun estando descalificado.
- Victorias automáticas, bonos y fichas de juego sin valor económico.
- Mesa con naipes originales y distribución vertical para móviles.
- Restauración del asiento al actualizar el navegador (token local privado).
- Modo de práctica contra computadora en `/solitario/`.

## Limitaciones importantes de esta beta

- **Las salas viven en la memoria del servidor.** Si Render reinicia o suspende la instancia, o si se vuelve a desplegar el proyecto, las salas y las partidas activas se pierden. Para una versión comercial y alta disponibilidad, será necesario guardar el estado en una base de datos persistente.
- El servicio gratuito de Render puede tardar en arrancar después de estar inactivo. Para uso frecuente o comercial, sugerimos un plan de pago y almacenamiento persistente.
- Los jugadores desconectados conservan su asiento cuando regresan desde el mismo navegador. Mientras están desconectados, el turno espera a que vuelvan; no se sustituyen por bots sin consentimiento.
- No incluye cuentas, apuestas reales, chat, ranking permanente, pagos, moderación avanzada ni protección antitrampas exhaustiva. No cobramos, apostamos ni transferimos dinero: las fichas son sólo virtuales.
- La aplicación se distribuye por navegador, todavía no por App Store o Google Play.

## Principales archivos

| Archivo | Función |
|---|---|
| `server.js` | Salas, participantes, autorización y sincronización HTTP/SSE |
| `server/core.js` | Motor de reglas, mazo y validación de jugadas |
| `public/index.html` | Pantallas del multijugador |
| `public/online.js` | Interacciones móviles, invitados y sincronización |
| `public/online.css` y `public/style.css` | Identidad visual y diseño |
| `public/solitario/` | Versión 1.2 contra computadora |
| `render.yaml` | Configuración para Render |
| `tests/` | Pruebas automatizadas |

## Créditos

**Desmoche Nica · Realizado por Ricardo Zambrana · 2026.** Naipes originales para Desmoche Nica, sin logos ni arte registrado de Bicycle.
