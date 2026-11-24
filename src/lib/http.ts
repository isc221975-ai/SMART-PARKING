import { NextResponse } from "next/server";

export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export const error = (message: string, status = 400) => json({ error: message }, status);

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    const text = await req.text();
    if (text.length > 20_000) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export const str = (v: unknown, max = 120): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
