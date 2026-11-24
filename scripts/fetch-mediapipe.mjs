// Copia el WASM de @mediapipe/tasks-vision y descarga el modelo FaceLandmarker a public/mediapipe.
// Se corre una vez al instalar (npm run setup:mediapipe); en tiempo de ejecución nada sale a un CDN.
import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "mediapipe");
const wasmSrc = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const exists = (p) => stat(p).then((s) => s.size > 0, () => false);

await mkdir(join(out, "wasm"), { recursive: true });
for (const f of ["vision_wasm_internal.js", "vision_wasm_internal.wasm"]) {
  await copyFile(join(wasmSrc, f), join(out, "wasm", f));
  console.log(`wasm/${f} copiado`);
}

const model = join(out, "face_landmarker.task");
if (await exists(model)) {
  console.log("face_landmarker.task ya existe");
} else {
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`No se pudo descargar el modelo: HTTP ${res.status}`);
  await writeFile(model, Buffer.from(await res.arrayBuffer()));
  console.log("face_landmarker.task descargado");
}
