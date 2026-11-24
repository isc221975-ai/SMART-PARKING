Carga la skill codigo-directo. Tarea acotada: actualizar POST /api/hardware/scan para el nuevo escáner de caseta. No toques nada más del proyecto.

## Contrato
Request (cabecera x-api-key, se mantiene la validación actual en tiempo constante):
{ "token": "<32 hex>", "qr_token": "<igual, compatibilidad>", "placa_leida": "TXA4821" | null }

Respuestas (siempre JSON con "ok", "action" y "code" cuando falla):
- 200 { ok: true, action: "OPEN", tipo: "entrada"|"salida", placa, nombre, fecha, placa_coincide: true|false|null }
- 400 { ok: false, action: "DENY", code: "QR_INVALIDO" }
- 404 { ok: false, action: "DENY", code: "NO_REGISTRADO" }
- 403 { ok: false, action: "DENY", code: "PLACA_NO_COINCIDE" | "SIN_PLACA", placa }   (solo con PLATE_CHECK=strict)
- 409 { ok: false, action: "IGNORE", code: "DUPLICADO" }
- 401 / 429 / 503 como hoy, agregando action: "DENY" y code.

## Reglas
1. Anti duplicado en el servidor: si el último acceso de esa placa fue hace menos de SCAN_MIN_INTERVAL_SECONDS (env, default 15), responde 409 DUPLICADO y NO registra nada.
2. Verificación de placa con la variable PLATE_CHECK = off | warn | strict (default off):
   - off: ignora placa_leida y placa_coincide es null.
   - warn: registra el acceso siempre; placa_coincide true/false si llegó placa_leida, y console.warn si no coincide.
   - strict: si placa_leida falta → 403 SIN_PLACA; si no coincide → 403 PLACA_NO_COINCIDE. En ambos casos NO registra el acceso.
3. Comparación tolerante a errores de OCR: normaliza a [A-Z0-9], iguala O/Q/D→0, I/L→1, Z→2, S→5, B→8, G→6 en ambos lados y acepta distancia de Levenshtein ≤ 1. Ponla como función pura en src/lib/plates.ts.
4. La verificación de placa y el anti duplicado ocurren ANTES de insertar en accesos. Ningún rechazo inserta filas.
5. Valida placa_leida: string opcional de máx. 12 caracteres, normalizada.
6. Agrega PLATE_CHECK y SCAN_MIN_INTERVAL_SECONDS a .env.example con un comentario.

## Pruebas
- Pruebas unitarias de src/lib/plates.ts (iguales, con guion, S/5, O/0, un carácter de menos, distintas, vacías).
- curl contra el endpoint: token válido (OPEN), el mismo token antes de 15 s (409 sin nueva fila), token inexistente (404), formato inválido (400), clave equivocada (401), y con PLATE_CHECK=strict una placa distinta (403 sin nueva fila). Usa solo vehículos de la cuenta de prueba y dime qué filas de prueba quedaron.
- npm run lint y npm run build sin errores.
