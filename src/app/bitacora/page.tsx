import { redirect } from "next/navigation";

// La bitácora ahora vive dentro del panel protegido.
export default function Page() {
  redirect("/admin/bitacora");
}
