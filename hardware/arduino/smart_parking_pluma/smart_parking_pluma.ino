/*
 * Smart Parking - Control de pluma y pantalla LCD
 * Placa: Arduino UNO / Nano
 * Librerías: Servo (incluida), LiquidCrystal I2C (Frank de Brabander)
 *
 * Conexiones
 *   Servo:    señal -> D9, VCC -> 5V (fuente externa si es MG996R), GND común
 *   LCD I2C:  SDA -> A4, SCL -> A5, VCC -> 5V, GND -> GND (dirección 0x27; prueba 0x3F si no enciende)
 *   Opcional: LED verde -> D5, LED rojo -> D6, buzzer -> D7 (cambia USAR_INDICADORES a 1)
 *
 * Protocolo serie (9600 baudios, una orden por línea terminada en \n)
 *   PC -> Arduino
 *     OPEN                     abre la pluma con mensaje por defecto
 *     OPEN;linea1;linea2       abre y muestra dos líneas (máx. 16 caracteres, sin acentos)
 *     DENY                     acceso denegado
 *     DENY;linea1;linea2       denegado con motivo
 *     INFO;linea1;linea2       solo muestra un mensaje (no mueve la pluma)
 *     CLOSE                    cierra la pluma de inmediato
 *     PING                     prueba de conexión
 *     STATUS                   estado actual
 *   Arduino -> PC
 *     READY                    al arrancar
 *     ACK OPEN | ACK DENY | ACK INFO | ACK CLOSE
 *     CLOSED                   la pluma terminó de cerrarse
 *     PONG
 *     STATE <CERRADA|ABRIENDO|ABIERTA|CERRANDO>
 *     ERR <motivo>
 *
 * Todo funciona con millis(): el Arduino nunca se bloquea y siempre responde.
 */

#include <Servo.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ───────── Configuración ─────────
const uint8_t  SERVO_PIN          = 9;
const uint8_t  ANGULO_CERRADA     = 0;
const uint8_t  ANGULO_ABIERTA     = 90;
const uint16_t MS_POR_GRADO       = 6;      // velocidad del movimiento (90° ≈ 0.5 s)
const uint32_t TIEMPO_ABIERTA_MS  = 5000;   // tiempo que la pluma queda arriba
const uint32_t TIEMPO_MENSAJE_MS  = 3000;   // tiempo que se muestra un aviso
const uint32_t BAUDIOS            = 9600;

const uint8_t  LCD_DIRECCION      = 0x27;

#define USAR_INDICADORES 0
const uint8_t  LED_VERDE = 5;
const uint8_t  LED_ROJO  = 6;
const uint8_t  BUZZER    = 7;

// ───────── Estado ─────────
LiquidCrystal_I2C lcd(LCD_DIRECCION, 16, 2);
Servo pluma;

enum EstadoPluma { CERRADA, ABRIENDO, ABIERTA, CERRANDO };
EstadoPluma estado = CERRADA;

uint8_t  anguloActual   = ANGULO_CERRADA;
uint32_t ultimoPaso     = 0;
uint32_t abiertaDesde   = 0;
uint32_t mensajeHasta   = 0;   // 0 = no hay aviso temporal en pantalla
bool     mostrandoEspera = true;

char     linea[64];
uint8_t  largo = 0;
bool     desbordada = false;

// ───────── Pantalla ─────────
void escribirLinea(uint8_t fila, const char* texto) {
  char buf[17];
  uint8_t i = 0;
  // Solo ASCII imprimible; el LCD no tiene acentos.
  for (; i < 16 && texto[i] != '\0'; i++) {
    char c = texto[i];
    buf[i] = (c >= 32 && c <= 126) ? c : ' ';
  }
  for (; i < 16; i++) buf[i] = ' ';
  buf[16] = '\0';
  lcd.setCursor(0, fila);
  lcd.print(buf);
}

void pantalla(const char* l1, const char* l2) {
  escribirLinea(0, l1);
  escribirLinea(1, l2);
}

void pantallaEspera() {
  pantalla("SMART PARKING", "Muestra tu QR");
  mostrandoEspera = true;
}

void avisoTemporal(const char* l1, const char* l2) {
  pantalla(l1, l2);
  mostrandoEspera = false;
  mensajeHasta = millis() + TIEMPO_MENSAJE_MS;
  if (mensajeHasta == 0) mensajeHasta = 1;
}

// ───────── Indicadores opcionales ─────────
void indicadores(bool verde, bool rojo) {
#if USAR_INDICADORES
  digitalWrite(LED_VERDE, verde ? HIGH : LOW);
  digitalWrite(LED_ROJO, rojo ? HIGH : LOW);
#else
  (void)verde; (void)rojo;
#endif
}

void pitido(uint16_t frecuencia, uint16_t duracion) {
#if USAR_INDICADORES
  tone(BUZZER, frecuencia, duracion);
#else
  (void)frecuencia; (void)duracion;
#endif
}

// ───────── Pluma ─────────
const char* nombreEstado() {
  switch (estado) {
    case CERRADA:  return "CERRADA";
    case ABRIENDO: return "ABRIENDO";
    case ABIERTA:  return "ABIERTA";
    default:       return "CERRANDO";
  }
}

void abrir() {
  if (estado == ABIERTA) {
    abiertaDesde = millis();   // otra autorización: extiende el tiempo
    return;
  }
  estado = ABRIENDO;
  indicadores(true, false);
}

void cerrar() {
  if (estado == CERRADA || estado == CERRANDO) return;
  estado = CERRANDO;
}

void actualizarPluma() {
  uint32_t ahora = millis();

  if (estado == ABIERTA && ahora - abiertaDesde >= TIEMPO_ABIERTA_MS) {
    estado = CERRANDO;
  }

  if ((estado == ABRIENDO || estado == CERRANDO) && ahora - ultimoPaso >= MS_POR_GRADO) {
    ultimoPaso = ahora;
    if (estado == ABRIENDO) {
      if (anguloActual < ANGULO_ABIERTA) anguloActual++;
      if (anguloActual >= ANGULO_ABIERTA) { estado = ABIERTA; abiertaDesde = ahora; }
    } else {
      if (anguloActual > ANGULO_CERRADA) anguloActual--;
      if (anguloActual <= ANGULO_CERRADA) {
        estado = CERRADA;
        indicadores(false, false);
        Serial.println(F("CLOSED"));
      }
    }
    pluma.write(anguloActual);
  }
}

// ───────── Órdenes ─────────
// Separa "CMD;uno;dos" sin usar String (evita fragmentar la memoria).
void partes(char* texto, char*& cmd, char*& l1, char*& l2) {
  cmd = texto; l1 = nullptr; l2 = nullptr;
  char* p = strchr(texto, ';');
  if (p) { *p = '\0'; l1 = p + 1; p = strchr(l1, ';'); if (p) { *p = '\0'; l2 = p + 1; } }
}

void procesar(char* texto) {
  char *cmd, *l1, *l2;
  partes(texto, cmd, l1, l2);

  if (strcmp(cmd, "OPEN") == 0) {
    abrir();
    pantalla(l1 && *l1 ? l1 : "ACCESO OK", l2 && *l2 ? l2 : "Bienvenido");
    mostrandoEspera = false;
    mensajeHasta = 0;            // el mensaje queda mientras la pluma esté arriba
    pitido(1800, 120);
    Serial.println(F("ACK OPEN"));
  } else if (strcmp(cmd, "DENY") == 0) {
    avisoTemporal(l1 && *l1 ? l1 : "ACCESO DENEGADO", l2 && *l2 ? l2 : "");
    if (estado == CERRADA) indicadores(false, true);
    pitido(400, 400);
    Serial.println(F("ACK DENY"));
  } else if (strcmp(cmd, "INFO") == 0) {
    avisoTemporal(l1 ? l1 : "", l2 ? l2 : "");
    Serial.println(F("ACK INFO"));
  } else if (strcmp(cmd, "CLOSE") == 0) {
    cerrar();
    Serial.println(F("ACK CLOSE"));
  } else if (strcmp(cmd, "PING") == 0) {
    Serial.println(F("PONG"));
  } else if (strcmp(cmd, "STATUS") == 0) {
    Serial.print(F("STATE "));
    Serial.println(nombreEstado());
  } else if (cmd[0] != '\0') {
    Serial.println(F("ERR orden desconocida"));
  }
}

void leerSerie() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\r') continue;
    if (c == '\n') {
      linea[largo] = '\0';
      if (desbordada) Serial.println(F("ERR linea demasiado larga"));
      else procesar(linea);
      largo = 0;
      desbordada = false;
    } else if (largo < sizeof(linea) - 1) {
      linea[largo++] = c;
    } else {
      desbordada = true;
    }
  }
}

// ───────── Programa ─────────
void setup() {
  Serial.begin(BAUDIOS);
#if USAR_INDICADORES
  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_ROJO, OUTPUT);
  pinMode(BUZZER, OUTPUT);
#endif
  pluma.attach(SERVO_PIN);
  pluma.write(ANGULO_CERRADA);

  lcd.init();
  lcd.backlight();
  pantallaEspera();

  Serial.println(F("READY"));
}

void loop() {
  leerSerie();
  actualizarPluma();

  // Regresa a la pantalla de espera cuando termina el aviso o se cierra la pluma.
  if (!mostrandoEspera) {
    bool avisoTerminado = mensajeHasta != 0 && (int32_t)(millis() - mensajeHasta) >= 0;
    bool plumaReposo = estado == CERRADA && mensajeHasta == 0;
    if (avisoTerminado || plumaReposo) {
      mensajeHasta = 0;
      indicadores(false, false);
      pantallaEspera();
    }
  }
}
