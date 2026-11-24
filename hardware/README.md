# Smart Parking · Hardware de caseta

```
 Celular con QR ──► Cámara USB ──► scanner.py ──► POST /api/hardware/scan (web)
                                     │                    │
                     (opcional)  Cámara de placas      OPEN / DENY
                                     │
                                     └──► USB serie ──► Arduino ──► Servo (pluma) + LCD 16x2
```

## Componentes del proyecto
| Componente | Uso | Notas |
|---|---|---|
| Cámara **OV9732** (720p, 1 MP, USB) | Lectura del QR | Gran angular: el celular se lee de cerca (20–40 cm). `QR_CAMERA_RES=1280x720` |
| Cámara **OV2720** (1080p, 30 FPS, USB) | Lectura de la placa | Más resolución = placa legible a más distancia. `PLATE_CAMERA_RES=1920x1080` |
| Arduino UNO | Controla pluma y LCD | Recibe OPEN/DENY por USB y responde ACK/CLOSED (retroalimentación) |
| Servomotor (señal PWM) | Pluma | 0° cerrada, 90° abierta |
| LCD 16x2 I2C | Mensajes al conductor | Dirección 0x27 (o 0x3F) |

Ambas cámaras son de **enfoque fijo ajustable**: gira el lente con cuidado hasta que el QR (cerca) o la placa (a la distancia real del auto) se vean nítidos. Conéctalas en puertos USB distintos de la PC, no en el mismo hub, para que las dos den sus FPS completos.

## 1. Arduino

### Material y conexiones
| Componente | Pin del componente | Arduino UNO |
|---|---|---|
| Servo (pluma) | Señal (naranja) | D9 |
| | VCC (rojo) | 5V · si es MG996R usa fuente externa de 5–6 V |
| | GND (café) | GND (siempre GND común con la fuente externa) |
| LCD 16x2 I2C | SDA / SCL | A4 / A5 |
| | VCC / GND | 5V / GND |
| Opcional | LED verde · LED rojo · buzzer | D5 · D6 · D7 (`USAR_INDICADORES 1`) |

### Cargar el programa
1. Arduino IDE → Herramientas → Administrar bibliotecas → instala **LiquidCrystal I2C** (Frank de Brabander). `Servo` ya viene incluida.
2. Abre `arduino/smart_parking_pluma/smart_parking_pluma.ino`, elige la placa y el puerto, y súbelo.
3. Prueba en el Monitor Serie (9600, «Nueva línea»): escribe `PING` → responde `PONG`; `OPEN;ENTRADA;TXA 4821` → la pluma sube y el LCD lo muestra.
4. Si el LCD enciende pero no muestra texto, gira el potenciómetro azul de atrás. Si no enciende, cambia `LCD_DIRECCION` a `0x3F`.

**Cierra el Monitor Serie antes de correr el escáner:** solo un programa puede usar el puerto a la vez.

## 2. Escáner (Windows)

```bat
cd scanner
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edita `scanner\.env`:
- `APP_URL`: `http://localhost:3000` si la web corre en esta PC, o la URL de Vercel.
- `HARDWARE_API_KEY`: **la misma** que `HARDWARE_API_KEY` en `.env.local` de la web.

Genera una clave nueva (la anterior quedó expuesta en el código y debe cambiarse):
```bat
python -c "import secrets; print(secrets.token_hex(24))"
```

### Comandos
```bat
python scanner.py --configurar     REM elegir cámara de QR (y de placas)
python scanner.py --probar         REM revisa servidor, clave y Arduino; el LCD dice PRUEBA OK
python scanner.py                  REM caseta en marcha
python scanner.py --token <qr>     REM simula una lectura sin cámara
python -m unittest discover tests  REM pruebas de la lógica
```

Teclas en la ventana: **Q** salir · **A** apertura manual (queda registrada en `logs/`) · **C** cerrar la pluma.

### Lectura de placa (opcional)
```bat
pip install -r requirements-ocr.txt
```
Pon `PLATE_CHECK=on` en `.env` y configura la segunda cámara. El escáner lee la placa durante `PLATE_TIMEOUT` segundos y la envía como `placa_leida`. La decisión de negar si no coincide la toma el servidor (ver la sección 3).

## 3. Contrato con la web

`POST /api/hardware/scan` · cabecera `x-api-key`
```json
{ "token": "<32 hex>", "placa_leida": "TXA4821" }
```
| Respuesta | Qué hace la caseta |
|---|---|
| `200 { action: "OPEN", tipo, placa, nombre }` | Abre y muestra `ENTRADA`/`SALIDA` + placa |
| `400/404 { action: "DENY" }` | Niega: QR no válido / no registrado |
| `409 { action: "IGNORE", code: "DUPLICADO" }` | No hace nada (lectura repetida) |
| `401` · `503` · sin red | Niega y lo avisa. **Nunca abre si hay error** |

## 4. Problemas comunes
| Síntoma | Solución |
|---|---|
| `pyzbar` falla con `libzbar-64.dll` | Instala *Visual C++ Redistributable 2013 (x64)*. Mientras tanto el escáner usa el lector de OpenCV automáticamente |
| «No encontré el Arduino» | Revisa el cable USB, cierra el Monitor Serie o pon `SERIAL_PORT=COM3` (Administrador de dispositivos → Puertos) |
| La pluma tiembla o el Arduino se reinicia | El servo consume mucho: aliméntalo con fuente externa y une los GND |
| «La clave no coincide» | Misma `HARDWARE_API_KEY` en la web y aquí; reinicia la web después de cambiarla |
| La cámara abre en negro | Cierra apps que la usen (Teams, Zoom, navegador) y vuelve a `--configurar` |
