/** Catálogo compartido (cliente y servidor) de la revisión de fotos. */

export const MOTIVOS_RECHAZO = [
  { value: "lentes", label: "Usa lentes" },
  { value: "gorra", label: "Usa gorra o algo en la cabeza" },
  { value: "rostro", label: "El rostro no se ve completo" },
  { value: "borrosa", label: "La foto está borrosa" },
  { value: "luz", label: "Hay poca luz" },
  { value: "no_real", label: "No es una foto real" },
  { value: "otra_persona", label: "Es otra persona" },
  { value: "otro", label: "Otro motivo" },
] as const;

export type MotivoRechazo = (typeof MOTIVOS_RECHAZO)[number]["value"];

export const EXCEPCION_LABEL: Record<string, string> = {
  medica: "Condición médica",
  religiosa: "Motivo religioso",
  discapacidad: "Discapacidad",
  sin_camara: "Sin cámara",
};

export const REGLA_LABEL: Record<string, string> = {
  R1: "Un solo rostro",
  R2: "De frente",
  R3: "Centrado",
  R4: "Ojos abiertos",
  R5: "Sin lentes",
  R6: "Sin gorra",
  R7: "Sin cubrebocas",
  R8: "Expresión neutral",
  R9: "Buena luz",
  R10: "Nítida y quieta",
  R11: "Prueba de vida",
};
