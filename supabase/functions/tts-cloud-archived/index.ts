// ARQUIVADA: proxy para o Google Cloud Text-to-Speech (API clássica texttospeech.googleapis.com).
// Substituída pela function `tts` (Gemini TTS) — mais natural e com controle de tom via prompt.
// Não é implantada nem chamada pelo cliente atual; mantida como referência/fallback futuro.
//
// Proxy para o Google Cloud Text-to-Speech.
//
// A API key do Google fica só aqui (secret do Supabase, `GOOGLE_TTS_API_KEY`) —
// nunca chega ao navegador. O cliente manda { text, voiceName? } e recebe de volta
// { chunks: string[] }: áudio MP3 em base64, já dividido em pedaços dentro do limite
// de 5000 bytes por chamada da API do Google (textos de capítulo inteiros excedem
// esse limite facilmente).
//
// Deploy: supabase functions deploy tts
// Secret: supabase secrets set GOOGLE_TTS_API_KEY=SUA_KEY_AQUI

const GOOGLE_TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";
const MAX_CHUNK_BYTES = 4500;
const DEFAULT_VOICE = "pt-BR-Neural2-A";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

/** Divide o texto em pedaços dentro do limite de bytes da API, preferindo cortar em fim de frase. */
function chunkText(text: string, maxBytes: number): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current) chunks.push(current);
    current = "";
  };

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (byteLength(candidate) <= maxBytes) {
      current = candidate;
      continue;
    }
    pushCurrent();
    if (byteLength(sentence) <= maxBytes) {
      current = sentence;
      continue;
    }
    // Frase isolada maior que o limite (raro): corta bruto por caracteres.
    let rest = sentence;
    while (byteLength(rest) > maxBytes) {
      let cut = Math.floor(rest.length * (maxBytes / byteLength(rest)));
      while (cut > 0 && byteLength(rest.slice(0, cut)) > maxBytes) cut--;
      chunks.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    current = rest;
  }
  pushCurrent();
  return chunks;
}

async function synthesizeChunk(apiKey: string, text: string, voiceName: string): Promise<string> {
  const res = await fetch(`${GOOGLE_TTS_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "pt-BR", name: voiceName },
      audioConfig: { audioEncoding: "MP3" },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Google TTS retornou ${res.status}: ${detail}`);
  }
  const data = (await res.json()) as { audioContent?: string };
  if (!data.audioContent) throw new Error("Google TTS não retornou áudio.");
  return data.audioContent;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Use POST." }, 405);

  const apiKey = Deno.env.get("GOOGLE_TTS_API_KEY");
  if (!apiKey) return jsonResponse({ error: "GOOGLE_TTS_API_KEY não configurada no servidor." }, 500);

  let body: { text?: unknown; voiceName?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corpo da requisição precisa ser JSON." }, 400);
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return jsonResponse({ error: "Campo 'text' é obrigatório." }, 400);
  const voiceName = typeof body.voiceName === "string" && body.voiceName ? body.voiceName : DEFAULT_VOICE;

  try {
    const chunks = chunkText(text, MAX_CHUNK_BYTES);
    const audioChunks: string[] = [];
    for (const chunk of chunks) {
      audioChunks.push(await synthesizeChunk(apiKey, chunk, voiceName));
    }
    return jsonResponse({ chunks: audioChunks });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Falha ao gerar áudio." }, 500);
  }
});
