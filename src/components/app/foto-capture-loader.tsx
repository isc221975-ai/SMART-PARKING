"use client";

import dynamic from "next/dynamic";

/** La captura (y MediaPipe) se cargan solo en esta pantalla y solo en el navegador. */
const FaceCapture = dynamic(() => import("@/features/face-capture/FaceCapture").then((m) => m.FaceCapture), {
  ssr: false,
  loading: () => (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
      <div className="skeleton h-6 w-48" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton mt-4 h-11 w-full" />
    </div>
  ),
});

export function FotoCaptureLoader({ debug }: { debug: boolean }) {
  return <FaceCapture debug={debug} />;
}
