// =========================================================
// Cliente Supabase + wrappers do quiz.
// O script @supabase/supabase-js carregado via CDN expõe
// `window.supabase`. Este módulo inicializa um client a
// partir das credenciais abaixo e oferece funções de alto
// nível usadas pelo resto da aplicação.
// =========================================================

// 👇 SUBSTITUA pelos valores do SEU projeto Supabase.
//    Project Settings → API → "Project URL" e "anon public" key.
//    A anon key é pública por design — segurança vem das policies de RLS.
const SUPABASE_URL = "https://lvnheymneiltxuyriyqd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2bmhleW1uZWlsdHh1eXJpeXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTE2OTYsImV4cCI6MjA5MzU4NzY5Nn0.odHQCPfNd1o4ArVLCaGN6tkqWrBuEfP8t9PLGDypfn8";

const isConfigured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR-PROJECT") &&
  SUPABASE_ANON_KEY !== "YOUR-ANON-KEY";

if (!isConfigured) {
  console.warn(
    "[supabase] Credenciais não configuradas. Edite supabase.js e preencha SUPABASE_URL e SUPABASE_ANON_KEY."
  );
}

export const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("[supabase] client inicializado", { configured: isConfigured });

// =========================================================
// Wrappers
// =========================================================

export async function createParticipant(name) {
  const { data, error } = await client
    .from("participants")
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  return data; // { id, name, created_at }
}

export async function saveAttempt(attempt, insertToken) {
  // Usa RPC para validar o insert_token antes de gravar — impede que terceiros
  // criem tentativas para participant_ids alheios.
  const { error } = await client.rpc("save_attempt", {
    p_participant_id: attempt.participant_id,
    p_insert_token:   insertToken,
    p_level:          attempt.level,
    p_score:          attempt.score,
    p_total:          attempt.total,
    p_percentage:     attempt.percentage,
    p_time_seconds:   attempt.time_seconds,
  });
  if (error) throw error;
}

export async function fetchRanking(limit = 20) {
  const { data, error } = await client
    .from("ranking_global")
    .select("*")
    .order("position", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function fetchMyPosition(participantId) {
  const { data, error } = await client
    .from("ranking_global")
    .select("position")
    .eq("participant_id", participantId)
    .maybeSingle();
  if (error) throw error;
  return data?.position ?? null;
}

export function subscribeRanking(onChange) {
  const channel = client
    .channel("ranking")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "quiz_attempts" },
      onChange
    )
    .subscribe();

  return () => client.removeChannel(channel);
}
