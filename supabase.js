import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Default credentials provided in project
const DEFAULT_URL = "https://cevgqeqijfdfvuxsaudy.supabase.co";
const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldmdxZXFpamZkZnZ1eHNhdWR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDk1MzMsImV4cCI6MjA5NjIyNTUzM30.IeZWS3MFHuXTeeTNj7qhGrAlta2TffzlEANJMCZGs90";

export function getSupabaseConfig() {
  const url = localStorage.getItem("POLL_SUPABASE_URL") || DEFAULT_URL;
  const key = localStorage.getItem("POLL_SUPABASE_KEY") || DEFAULT_KEY;
  return { url: url.trim(), key: key.trim() };
}

let currentConfig = getSupabaseConfig();
export let supabase = createClient(currentConfig.url, currentConfig.key);

export function updateSupabaseConfig(newUrl, newKey) {
  if (newUrl) localStorage.setItem("POLL_SUPABASE_URL", newUrl.trim());
  if (newKey) localStorage.setItem("POLL_SUPABASE_KEY", newKey.trim());
  currentConfig = getSupabaseConfig();
  supabase = createClient(currentConfig.url, currentConfig.key);
  return supabase;
}

export function resetSupabaseConfig() {
  localStorage.removeItem("POLL_SUPABASE_URL");
  localStorage.removeItem("POLL_SUPABASE_KEY");
  currentConfig = { url: DEFAULT_URL, key: DEFAULT_KEY };
  supabase = createClient(DEFAULT_URL, DEFAULT_KEY);
  return supabase;
}

export async function checkSupabaseHealth() {
  const cfg = getSupabaseConfig();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(`${cfg.url}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return { ok: resp.ok || resp.status === 200 || resp.status === 404, status: resp.status };
  } catch (err) {
    return { ok: false, error: err.message || "Unreachable" };
  }
}