/** Esqueleto con la forma de las pantallas del portal mientras carga la sección. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton h-9 w-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <div className="skeleton h-[28rem] rounded-2xl" />
        <div className="flex flex-col gap-6">
          <div className="skeleton h-28 rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="skeleton h-28 rounded-2xl" />
            <div className="skeleton h-28 rounded-2xl" />
          </div>
          <div className="skeleton h-32 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
