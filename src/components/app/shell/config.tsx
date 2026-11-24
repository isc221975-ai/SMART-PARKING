import {
  Car,
  ChartBar,
  ClockCounterClockwise,
  House,
  ListChecks,
  Notebook,
  QrCode,
  UserCircle,
  Users,
  type Icon,
} from "@phosphor-icons/react";
import type { HelpTopic, ShortcutInfo } from "./help-dialog";

export type Panel = "cliente" | "admin";

export interface NavLink {
  href: string;
  label: string;
  icon: Icon;
  /** Tecla de atajo (solo informativa en la ayuda). */
  key?: string;
}

/** Elemento de la barra inferior móvil: enlace o acción. */
export type MobileItem = (NavLink & { action?: undefined }) | { action: "showQr"; label: string; icon: Icon };

export const NAV: Record<Panel, NavLink[]> = {
  cliente: [
    { href: "/cliente", label: "Inicio", icon: House },
    { href: "/cliente/vehiculos", label: "Vehículos", icon: Car, key: "V" },
    { href: "/cliente/historial", label: "Historial", icon: ClockCounterClockwise, key: "H" },
    { href: "/cliente/perfil", label: "Mi perfil", icon: UserCircle },
  ],
  admin: [
    { href: "/admin", label: "Resumen", icon: ChartBar, key: "1" },
    { href: "/admin/accesos", label: "Accesos", icon: ListChecks, key: "2" },
    { href: "/admin/vehiculos", label: "Vehículos", icon: Car, key: "3" },
    { href: "/admin/usuarios", label: "Usuarios", icon: Users, key: "4" },
    { href: "/admin/bitacora", label: "Bitácora", icon: Notebook, key: "5" },
  ],
};

export const MOBILE_NAV: Record<Panel, MobileItem[]> = {
  cliente: [
    NAV.cliente[0]!,
    { action: "showQr", label: "Mostrar QR", icon: QrCode },
    NAV.cliente[1]!,
    NAV.cliente[2]!,
  ],
  admin: NAV.admin,
};

export const SHORTCUTS: Record<Panel, ShortcutInfo[]> = {
  cliente: [
    { keys: ["Ctrl", "K"], label: "Abrir el buscador de comandos" },
    { keys: ["Q"], label: "Mostrar mi credencial QR" },
    { keys: ["V"], label: "Ir a Vehículos" },
    { keys: ["H"], label: "Ir a Historial" },
    { keys: ["?"], label: "Ver los atajos" },
  ],
  admin: [
    { keys: ["Ctrl", "K"], label: "Abrir el buscador de comandos" },
    { keys: ["1"], label: "Ir a Resumen" },
    { keys: ["2"], label: "Ir a Accesos" },
    { keys: ["3"], label: "Ir a Vehículos" },
    { keys: ["4"], label: "Ir a Usuarios" },
    { keys: ["5"], label: "Ir a Bitácora" },
    { keys: ["/"], label: "Buscar placa, persona o matrícula" },
    { keys: ["E"], label: "Exportar a CSV la tabla visible" },
    { keys: ["?"], label: "Ver los atajos" },
  ],
};

const HELP_CLIENTE: HelpTopic[] = [
  {
    title: "Cómo usar tu credencial",
    text: "Toca «Mostrar QR» (o la tecla Q), sube el brillo de la pantalla y acerca el código al escáner de la caseta. Cada placa tiene su propio código: si registraste varias, elige la del vehículo con el que llegas.",
  },
  {
    title: "Si cambias de auto",
    text: "Registra la placa nueva en Vehículos. Si ya no usarás la anterior, bórrala: su código deja de funcionar en la caseta de inmediato y se borran los movimientos registrados con ella.",
  },
  {
    title: "Por qué se cierra tu sesión",
    text: "Si pasan 5 minutos sin que uses el portal, la sesión se cierra sola. Así nadie puede mostrar tu credencial si dejas el teléfono desbloqueado.",
  },
];

const HELP_ADMIN: Record<string, HelpTopic[]> = {
  "/admin": [
    { title: "Resumen", text: "Elige Hoy, 7 o 30 días para ver accesos, entradas y salidas del periodo. Vehículos y usuarios registrados son totales." },
    { title: "Cámara de la caseta", text: "Se enciende solo cuando tocas «Encender cámara» y se apaga al salir de la página. La imagen no se graba." },
    { title: "Dentro ahora", text: "Cuenta los vehículos cuya lectura más reciente fue una entrada." },
  ],
  "/admin/accesos": [
    { title: "Accesos", text: "Por defecto ves los últimos 7 días. Cambia el periodo o elige Desde y Hasta. Cada lectura del escáner alterna entrada y salida según la lectura anterior de esa placa." },
    { title: "Borrar un acceso", text: "Úsalo solo para corregir lecturas erróneas. No se puede deshacer." },
    { title: "Exportar", text: "El CSV incluye solo los registros que coinciden con la búsqueda y las fechas elegidas." },
  ],
  "/admin/vehiculos": [
    { title: "Vehículos", text: "Cada placa pertenece a una cuenta y tiene su propio código QR." },
    { title: "Borrar un vehículo", text: "Su credencial deja de funcionar en la caseta y también se borran los accesos registrados con esa placa. No se puede deshacer." },
  ],
  "/admin/usuarios": [
    { title: "Usuarios", text: "Personas registradas con correo institucional. El tipo de cuenta se asigna según el formato del correo. Las fotos se cargan con enlaces que vencen en 5 minutos." },
    { title: "Borrar un usuario", text: "También se eliminan sus vehículos, sus accesos y su cuenta de acceso. No se puede deshacer." },
  ],
  "/admin/fotos": [
    { title: "Revisión de fotos", text: "Ves una foto a la vez, la más antigua primero. Aprueba con A o rechaza con R y elige el motivo: la persona lo verá en su perfil." },
    { title: "Prevalidación", text: "El teléfono revisó cada regla antes de enviar. Lentes, gorra y cubrebocas son estimaciones: confírmalas viendo la foto. «Sin prueba» significa que se subió de un archivo." },
    { title: "Al aprobar", text: "La foto nueva queda vigente y la aprobada anterior se borra del almacenamiento." },
  ],
  "/admin/bitacora": [
    { title: "Bitácora", text: "Registra a los visitantes sin cuenta, como proveedores o personal de mantenimiento, con empresa, asunto y placa." },
    { title: "Horas", text: "Anota la hora de entrada al llegar y la de salida cuando se retiren." },
  ],
};

export function helpFor(panel: Panel, pathname: string): { heading: string; topics: HelpTopic[] } {
  if (panel === "cliente") return { heading: "Ayuda y atajos", topics: HELP_CLIENTE };
  const key = Object.keys(HELP_ADMIN)
    .sort((a, b) => b.length - a.length)
    .find((k) => pathname === k || pathname.startsWith(`${k}/`));
  return { heading: "Ayuda de esta sección", topics: HELP_ADMIN[key ?? "/admin"]! };
}
