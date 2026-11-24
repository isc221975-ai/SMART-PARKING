import { HistorialSkeleton } from "@/components/app/historial-view";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando historial">
      <div className="flex flex-col gap-2 pb-4">
        <div className="skeleton h-9 w-40" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>
      <div className="skeleton h-48 rounded-2xl" />
      <HistorialSkeleton />
    </div>
  );
}
