// ARQUIVADA: proxy para o Gemini TTS (modelos "native audio output" da Generative
// Language API). Voltamos para a function `tts` (Google Cloud Text-to-Speech, API
// estável) por preferência do projeto. Não é implantada nem chamada pelo cliente
// atual; mantida como referência/fallback futuro.
//
// A API key do Gemini fica só aqui (secret do Supabase, `GEMINI_API_KEY`) — nunca chega
// ao navegador. O cliente manda { text, voiceName? } e recebe de volta { chunks: string[] }:
// áudio já empacotado como WAV em base64 (o Gemini devolve PCM cru, sem cabeçalho, que
// nenhum navegador toca sozinho — por isso embrulhamos aqui antes de responder).
//
// IMPORTANTE: esta é uma API em preview; confira o formato exato da requisição/resposta
// em https://ai.google.dev/gemini-api/docs/speech-generation antes de depender disso em
// produção — nomes de campos podem mudar entre versões preview.
//
// Deploy: supabase functions deploy tts-gemini-archived
// Secret: supabase secrets set GEMINI_API_KEY=SUA_KEY_AQUI

const GEMINI_MODEL = "gemini-2.5-flash-preview-tts";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const DEFAULT_VOICE = "Kore";
// Chunk conservador: o limite real de contexto do modelo é bem maior, mas pedaços menores
// tocam mais rápido (o primeiro pedaço já pode começar enquanto os demais são gerados em
// requisições futuras) e reduzem o impacto de uma eventual falha isolada num pedaço.
const MAX_CHUNK_CHARS = 2000;

// Instrução de estilo enviada junto ao texto: é assim que se controla tom/entonação no
// Gemini TTS (não existem parâmetros numéricos de pitch/rate como nas APIs clássicas).
const STYLE_PREFIX =
  "Leia o texto a seguir em português do Brasil, em voz clara, calma e didática, " +
  "como um professor explicando com atenção para um aluno. Não leia estas instruções em voz alta. Texto: ";

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

/** Divide o texto em pedaços menores, preferindo cortar em fim de frase. */
function chunkText(text: string, maxChars: number): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    if (current) chunks.push(current);
    current = "";
  };

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    flush();
    if (sentence.length <= maxChars) {
      current = sentence;
      continue;
    }
    // Frase isolada maior que o limite (raro): corta em pedaços de tamanho fixo, em ordem.
    let rest = sentence;
    while (rest.length > maxChars) {
      chunks.push(rest.slice(0, maxChars));
      rest = rest.slice(maxChars);
    }
    current = rest;
  }
  flush();
  return chunks;
}

/** Embrulha PCM cru (16-bit, mono, little-endian) num cabeçalho WAV, para o navegador conseguir tocar. */
function pcmToWavBase64(pcmBase64: string, sampleRateHz: number): string {
  const pcmBinary = atob(pcmBase64);
  const pcmLength = pcmBinary.length;
  const headerLength = 44;
  const buffer = new ArrayBuffer(headerLength + pcmLength);
  const view = new DataView(buffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  const byteRate = sampleRateHz * 2; // 16-bit mono
  writeString(0, "RIFF");
  view.setUint32(4, 36 + pcmLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // tamanho do subchunk fmt
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRateHz, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, 2, true); // block align (16-bit mono)
  view.setUint16(34, 16, true); // bits por amostra
  writeString(36, "data");
  view.setUint32(40, pcmLength, true);

  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < pcmLength; i++) bytes[headerLength + i] = pcmBinary.charCodeAt(i);

  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** Extrai a taxa de amostragem do mimeType retornado (ex.: "audio/L16;codec=pcm;rate=24000"). */
function sampleRateFromMimeType(mimeType: string | undefined): number {
  const match = mimeType?.match(/rate=(\d+)/);
  return match ? Number(match[1]) : 24000;
}

async function synthesizeChunk(apiKey: string, text: string, voiceName: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${STYLE_PREFIX}${text}` }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini TTS retornou ${res.status}: ${detail}`);
  }
  const data = await res.json();
  const part = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!part?.data) throw new Error("Gemini TTS não retornou áudio.");
  return pcmToWavBase64(part.data as string, sampleRateFromMimeType(part.mimeType as string | undefined));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Use POST." }, 405);

  // verify_jwt está desligado (ver config.toml) para o preflight OPTIONS funcionar, então
  // esta function fica acessível a quem souber a URL. Isso é aceitável aqui: a anon key
  // do Supabase é pública por natureza (não daria proteção real) e a defesa que importa
  // é a key do Gemini nunca sair do servidor, mais o alerta de orçamento no Google Cloud.
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return jsonResponse({ error: "GEMINI_API_KEY não configurada no servidor." }, 500);

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
    const chunks = chunkText(text, MAX_CHUNK_CHARS);
    // Em paralelo, não em sequência: um capítulo grande pode virar 6-7 pedaços, e chamar o
    // Gemini um de cada vez soma a latência de todos — o suficiente para estourar o limite
    // de execução da function (erro 546 do Supabase Edge Runtime = tempo esgotado).
    // Promise.all preserva a ordem do array mesmo que as respostas cheguem fora de ordem.
    const audioChunks = await Promise.all(chunks.map((chunk) => synthesizeChunk(apiKey, chunk, voiceName)));
    return jsonResponse({ chunks: audioChunks });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Falha ao gerar áudio." }, 500);
  }
});
