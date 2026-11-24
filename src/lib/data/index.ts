import "server-only";
import { hasSupabase } from "@/lib/env";
import { supabaseRepository } from "./supabase";
import type { Repository } from "./types";

/** Punto único de acceso a datos: siempre Supabase. */
export function repo(): Repository {
  if (!hasSupabase()) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
  }
  return supabaseRepository;
}

export * from "./types";
