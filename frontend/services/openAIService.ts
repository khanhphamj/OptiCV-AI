import { AnalysisResult, ValidationResult, StructuredJd, ChatMessage, CoverLetterResult, CoverLetterTone, CvProfile } from '../types';
import { CV_ANALYSIS_MODEL } from '../constants';

// Backend base URL. Set VITE_API_BASE_URL in frontend/.env.local (or Vercel env).
// Falls back to same-origin so a reverse-proxy setup still works.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
const OPENAI_ENDPOINT = `${API_BASE_URL}/api/openai`;
const OPENAI_STREAM_ENDPOINT = `${API_BASE_URL}/api/openai/stream`;
const COVER_LETTER_ENDPOINT = `${API_BASE_URL}/api/cover-letter`;
const COVER_LETTER_DOCX_ENDPOINT = `${API_BASE_URL}/api/cover-letter/docx`;

/** Caps the conversation length the backend sees. We always preserve the
 *  initial primer (CV + JD + areas) and the most recent N turns. */
const CHAT_HISTORY_TAIL_TURNS = 20;
/** Hard ceiling on how long a single chat reply can take. Aligns with the
 *  backend OPENAI_TIMEOUT_SECONDS so the user never spins forever. */
const CHAT_REQUEST_TIMEOUT_MS = 90_000;

export async function generateCoverLetter(
  cvText: string,
  jdText: string,
  tone: CoverLetterTone = 'professional',
): Promise<CoverLetterResult> {
  const response = await fetch(COVER_LETTER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cv_text: cvText, jd_text: jdText, tone }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cover Letter Error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json() as Promise<CoverLetterResult>;
}

export async function downloadCoverLetterDocx(letter: string, filename = 'cover-letter'): Promise<Blob> {
  const response = await fetch(COVER_LETTER_DOCX_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ letter, filename }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DOCX Export Error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.blob();
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

async function makeOpenAIRequest(messages: any[], options: {
  temperature?: number;
  responseFormat?: any;
  systemMessage?: string;
} = {}) {
  const { temperature = 0.2, responseFormat, systemMessage } = options;

  const requestMessages: Array<{ role: string; content: string }> = [];
  if (systemMessage) {
    requestMessages.push({ role: 'system', content: systemMessage });
  }
  requestMessages.push(...messages);

  const requestBody: Record<string, unknown> = {
    model: CV_ANALYSIS_MODEL,
    messages: requestMessages,
    temperature,
  };
  if (responseFormat) {
    requestBody.response_format = responseFormat;
  }

  let response: Response;
  try {
    response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Network request failed while contacting backend at ${OPENAI_ENDPOINT}. ` +
        'Check VITE_API_BASE_URL and that the backend is reachable.'
      );
    }
    throw error;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backend API Error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

// Schema definitions for structured outputs
const subScoreDetailSchema = {
  type: "object",
  description: "A detailed breakdown for a specific metric.",
  properties: {
    score: { type: "integer", description: "A score from 0 to 100 for this specific metric." },
    description: { type: "string", description: "A one-sentence explanation of why this score was given, based on the CV and JD." },
    improvement_tip: { type: "string", description: "A one-sentence, actionable tip for the user to improve this specific area." },
  },
  required: ["score", "description", "improvement_tip"],
  additionalProperties: false
};

const analysisSchema = {
  type: "object",
  description: "A comprehensive analysis of how well a CV matches a job description.",
  properties: {
    suitability_score: { type: "integer", description: "Overall suitability score from 0 to 100." },
    sub_scores: {
      type: "object",
      description: "Detailed breakdown of specific metrics, weighted to mirror real HR scanning behaviour.",
      properties: {
        role_alignment: subScoreDetailSchema,
        skill_coverage: subScoreDetailSchema,
        experience_fit: subScoreDetailSchema,
        recency: subScoreDetailSchema,
        quantification: subScoreDetailSchema,
        keyword_match: subScoreDetailSchema,
      },
      required: [
        "role_alignment",
        "skill_coverage",
        "experience_fit",
        "recency",
        "quantification",
        "keyword_match",
      ],
      additionalProperties: false
    },
    summary: { type: "string", description: "A 2-3 sentence summary of the overall fit." },
    strengths: {
      type: "array",
      description: "List of 3-5 key strengths.",
      items: { type: "string" }
    },
    weaknesses: {
      type: "array",
      description: "List of 3-5 key areas for improvement.",
      items: { type: "string" }
    },
    recommendations: {
      type: "array",
      description: "List of 3-5 specific, actionable recommendations.",
      items: { type: "string" }
    }
  },
  required: ["suitability_score", "sub_scores", "summary", "strengths", "weaknesses", "recommendations"],
  additionalProperties: false
};

const structuredJdSchema = {
  type: "object",
  description: "A structured representation of a job description.",
  properties: {
    job_title: { type: "string" },
    company_name: { type: "string" },
    location: { type: "string" },
    work_type: { type: "string" },
    salary: { type: "string" },
    experience_required: { type: "string" },
    education_required: { type: "string" },
    job_summary: { type: "string" },
    key_responsibilities: {
      type: "array",
      items: { type: "string" }
    },
    requirements: {
      type: "object",
      properties: {
        mandatory: {
          type: "object",
          properties: {
            education: { type: "string" },
            experience: { type: "string" },
            technical_skills: {
              type: "array",
              items: { type: "string" }
            },
            languages: {
              type: "array",
              items: { type: "string" }
            }
          },
          additionalProperties: false
        },
        preferred: {
          type: "array",
          items: { type: "string" }
        }
      },
      additionalProperties: false
    },
    benefits: {
      type: "object",
      properties: {
        salary_and_bonus: {
          type: "array",
          items: { type: "string" }
        },
        welfare: {
          type: "array",
          items: { type: "string" }
        }
      },
      additionalProperties: false
    },
    application_info: {
      type: "object",
      properties: {
        deadline: { type: "string" },
        vacancies: { type: "string" },
        contact: { type: "string" },
        how_to_apply: { type: "string" }
      },
      additionalProperties: false
    },
    required_documents: {
      type: "array",
      items: { type: "string" }
    },
    company_summary: { type: "string" },
    why_choose_us: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["job_title"],
  additionalProperties: false
};

const cvProfileSchema = {
  type: "object",
  description: "Structured profile extracted from a CV to drive job search.",
  properties: {
    title: {
      type: ["string", "null"],
      description: "Most recent or target job title (e.g. 'Senior Backend Developer'). Null if unclear.",
    },
    role: {
      type: ["string", "null"],
      description: "Broad role/function (e.g. 'Backend Engineer', 'Data Analyst'). Null if unclear.",
    },
    level: {
      type: ["string", "null"],
      description: "Seniority (e.g. 'Intern', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager'). Null if unclear.",
    },
    location: {
      type: ["string", "null"],
      enum: ["ho_chi_minh", "ha_noi", null],
      description: "Detected preferred work city. 'ho_chi_minh' for TP.HCM/Saigon, 'ha_noi' for Hanoi. Null otherwise.",
    },
    skills: {
      type: "array",
      items: { type: "string" },
      description: "Up to 12 most prominent technical/professional skills.",
    },
    years_experience: {
      type: ["integer", "null"],
      description: "Approximate total years of professional experience, null if unclear.",
    },
  },
  required: ["title", "role", "level", "location", "skills", "years_experience"],
  additionalProperties: false,
};

const validationSchema = {
  type: "object",
  description: "Validation results for CV and JD documents.",
  properties: {
    is_cv_valid: { type: "boolean" },
    is_jd_valid: { type: "boolean" },
    cv_reason: { type: "string" },
    jd_reason: { type: "string" }
  },
  required: ["is_cv_valid", "is_jd_valid"],
  additionalProperties: false
};

export async function parseCvProfile(cvText: string): Promise<CvProfile> {
  const systemInstruction = `You extract a concise structured profile from a CV so a job search can be run.
  - Infer the most recent or target title, the broad role, seniority level, and preferred location.
  - Only set location to 'ho_chi_minh' (TP. HCM / Saigon / Ho Chi Minh City) or 'ha_noi' (Hanoi) if the CV makes that clear; otherwise null.
  - List up to 12 most prominent skills. Missing fields MUST be null (not guessed).
  - Respond ONLY with JSON matching the schema.`;

  const prompt = `Extract the profile from this CV:

**CV TEXT:**
---
${cvText}
---`;

  try {
    const apiCall = makeOpenAIRequest([{ role: 'user', content: prompt }], {
      systemMessage: systemInstruction,
      temperature: 0.1,
      responseFormat: { type: "json_schema", json_schema: { name: "cv_profile", schema: cvProfileSchema } }
    });

    const response = await withTimeout(apiCall, 60000);
    const result = JSON.parse(response.choices[0].message.content);
    return result as CvProfile;
  } catch (error) {
    console.error("Error parsing CV profile:", error);
    if (error instanceof Error) {
      throw new Error(`CV Profile Parse Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while parsing the CV profile.");
  }
}

export async function validateDocuments(cvText: string, jdText: string): Promise<ValidationResult> {
  const systemInstruction = `You are a document validation expert. Your task is to determine if the provided CV and Job Description texts are valid and suitable for analysis.
  
  For the CV:
  - Check if it contains professional information (work experience, skills, education, etc.)
  - Ensure it's not just a template or placeholder text
  - Verify it has substantial content (more than just basic contact info)
  
  For the Job Description:
  - Check if it contains job-related information (responsibilities, requirements, etc.)
  - Ensure it's not just company marketing material
  - Verify it has actual job requirements and duties
  
  If either document is invalid, provide a clear reason explaining what's missing or wrong.
  You MUST respond ONLY with a valid JSON object that adheres to the provided schema.`;

  const prompt = `Please validate these documents:

**CV TEXT:**
---
${cvText}
---

**JOB DESCRIPTION TEXT:**
---
${jdText}
---`;

  try {
    const apiCall = makeOpenAIRequest([{ role: 'user', content: prompt }], {
      systemMessage: systemInstruction,
      temperature: 0.1,
      responseFormat: { type: "json_schema", json_schema: { name: "validation_result", schema: validationSchema } }
    });

    const response = await withTimeout(apiCall, 30000);
    const result = JSON.parse(response.choices[0].message.content);
    return result as ValidationResult;

  } catch (error) {
    console.error("Error calling OpenAI API for validation:", error);
    if (error instanceof Error) {
      throw new Error(`OpenAI Validation Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while validating documents with the AI.");
  }
}

export async function analyzeCv(cvText: string, jdText: string): Promise<AnalysisResult> {
  const systemInstruction = `You are an expert recruiter who scores CVs the way a senior HR / hiring manager would in a real screening pass — not the way a naive ATS would. You are scoring across SIX weighted dimensions and a single overall suitability score (0-100). Your output must be objective, evidence-driven, and grounded only in the two documents.

# How real HR scans a CV (mental model you must follow)

1. **First 6-10 seconds** — they read the candidate's CURRENT or most recent title, seniority, and the top of the most recent role. If that doesn't match the JD title/level, the CV is rejected before anything else is scored. **Title alignment is the dominant signal.**
2. **Recency dominates** — recent experience (last 0-3 years) carries far more weight than experience 5+ years ago. A 5-year-old skill rarely counts.
3. **Required vs nice-to-have** — JDs separate must-haves from nice-to-haves. Missing a required skill/qualification is a near-disqualifier; missing nice-to-haves is fine.
4. **Quantified impact** ≠ "has numbers" — "shipped 3 features" is trivially quantified; "led the migration that cut infra cost by $2M/yr" is impactful. Score the magnitude/scope, not the presence of digits.
5. **Keyword match** is the weakest signal — useful only as an ATS-passability proxy. Don't let high keyword overlap mask poor role/experience fit.

# Scoring rubric (per dimension, 0-100)

- **role_alignment** — Does the candidate's CURRENT/most recent title + responsibilities match the JD's target title and seniority band? Penalise level mismatch hard (junior CV → senior JD: cap at 50). Penalise unrelated current role even if past roles fit.
- **skill_coverage** — How many of the JD's REQUIRED skills are present in the CV with credible evidence? Required missing → heavy penalty (each missing required skill drops 10-20 points). Nice-to-have missing → small penalty (2-5 points).
- **experience_fit** — Total YoE alignment combined with relevant-domain YoE. If JD asks 5+ years and CV shows 6 in unrelated areas + 1 relevant, score low. Cap at 70 if seniority band is wrong even when total years match.
- **recency** — Are the matching skills/experiences from the last 0-3 years? 0-1 yr ago = full credit; 2-3 yr = light decay; 4-5 yr = moderate decay; 6+ yr = score < 40 even if listed.
- **quantification** — Quality of impact statements, not count. Look for scope (team size, revenue, user count, % improvement, $ saved). Generic "improved performance" without numbers = low. "Reduced p95 latency from 800ms to 120ms across 5M req/day" = high.
- **keyword_match** — Lexical/semantic overlap with JD keywords (titles, tools, frameworks, domain terms). Treat as an ATS-passability check.

# Overall \`suitability_score\` (weighted)

Compute as a weighted blend, then apply common-sense adjustments:
\`\`\`
suitability_score ≈
  0.25 * role_alignment +
  0.20 * skill_coverage +
  0.18 * experience_fit +
  0.13 * keyword_match +
  0.12 * recency +
  0.12 * quantification
\`\`\`
Adjustments after the weighted blend:
- If a JD-stated **required** qualification (degree, certification, language, location, work authorization) is clearly missing from the CV → cap suitability_score at 55 and surface the gap as the FIRST item in \`weaknesses\`.
- If role_alignment < 40 → cap suitability_score at 60 (HR will not advance these regardless of other strengths).
- Round to the nearest integer.

# weaknesses field — order matters

List weaknesses in the order an HR would reject on. Required-qualification gaps first, then role/seniority mismatch, then missing required skills, then quantification/recency issues. Be specific (\"JD requires AWS Solutions Architect cert; CV has no certification listed\") rather than vague (\"could improve certifications\").

# Tone

For sub_scores, the \`description\` is one objective sentence citing concrete evidence from the CV/JD. The \`improvement_tip\` is one actionable instruction the candidate could apply to their CV today. Avoid hedging. Avoid filler praise.

You MUST respond ONLY with a valid JSON object that adheres to the provided schema. No markdown, no preamble.`;

  const prompt = `Please analyze the following CV and Job Description.

**CV TEXT:**
---
${cvText}
---

**JOB DESCRIPTION TEXT:**
---
${jdText}
---`;
  
  try {
    const apiCall = makeOpenAIRequest([{ role: 'user', content: prompt }], {
      systemMessage: systemInstruction,
      temperature: 0.2,
      responseFormat: { type: "json_schema", json_schema: { name: "analysis_result", schema: analysisSchema } }
    });

    const response = await withTimeout(apiCall, 200000);
    const result = JSON.parse(response.choices[0].message.content);
    return result as AnalysisResult;

  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    if (error instanceof Error) {
        throw new Error(`OpenAI API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI.");
  }
}

export async function structureJd(jdText: string): Promise<StructuredJd> {
    const systemInstruction = `You are an expert HR analyst. Your task is to parse a raw job description text and structure it into a clean JSON format based on a very specific English template.
    You must categorize all information into the fields provided in the schema.
    - Read the entire JD carefully.
    - Extract and assign information to the correct English fields like 'job_title', 'key_responsibilities', 'requirements', etc.
    - For the 'requirements' object, clearly distinguish between mandatory and preferred qualifications. If the JD doesn't explicitly separate them, use your judgment to categorize them. For the 'mandatory' object, fill in the specific sub-fields like 'education', 'experience', 'technical_skills', and 'languages'.
    - For the 'benefits' object, separate details into 'salary_and_bonus' and 'welfare'.
    - Retain as much of the original phrasing as possible.
    - If a section in the template is not present in the JD, provide a null value for single fields or an empty array for list fields.
    - You MUST respond ONLY with a valid JSON object adhering to the schema. Do not add any extra text or markdown.`;

    const prompt = `Please structure this job description:

**JOB DESCRIPTION TEXT:**
---
${jdText}
---`;

    try {
        const apiCall = makeOpenAIRequest([{ role: 'user', content: prompt }], {
            systemMessage: systemInstruction,
            temperature: 0.1,
            responseFormat: { type: "json_schema", json_schema: { name: "structured_jd", schema: structuredJdSchema } }
        });
        
        const response = await withTimeout(apiCall, 200000);
        const result = JSON.parse(response.choices[0].message.content);
        return result as StructuredJd;
    } catch (error) {
        console.error("Error calling OpenAI API for JD structuring:", error);
        if (error instanceof Error) {
            throw new Error(`OpenAI Structuring Error: ${error.message}`);
        }
        throw new Error("An unknown error occurred while structuring the Job Description with the AI.");
    }
}

type ChatRole = 'user' | 'assistant';
interface ChatHistoryEntry {
  role: ChatRole;
  content: string;
}

/** Trim history sent upstream so token cost stays bounded.
 *  The first entry (the primer with CV + JD + focus areas) is always kept
 *  because the model loses critical context without it. The remaining tail
 *  follows the most recent `tailTurns * 2` messages (one user + one assistant
 *  per turn), aligned to start on a user message so role pairing stays valid. */
function capHistory(messages: ChatHistoryEntry[], tailTurns: number): ChatHistoryEntry[] {
  if (messages.length <= 1) return messages;
  const primer = messages[0];
  const rest = messages.slice(1);
  const tailSize = tailTurns * 2;
  if (rest.length <= tailSize) return [primer, ...rest];

  let start = rest.length - tailSize;
  while (start < rest.length && rest[start].role !== 'user') start += 1;
  return [primer, ...rest.slice(start)];
}

/** Read SSE frames emitted by /api/openai/stream and yield parsed JSON objects.
 *  Lines that don't match `data: …` are ignored; `data: [DONE]` ends the stream. */
async function* readSSE(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<Record<string, unknown>, void, unknown> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nlIdx = buffer.indexOf('\n');
      while (nlIdx !== -1) {
        const line = buffer.slice(0, nlIdx).replace(/\r$/, '');
        buffer = buffer.slice(nlIdx + 1);
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          if (data === '[DONE]') return;
          try {
            yield JSON.parse(data) as Record<string, unknown>;
          } catch {
            /* skip malformed frame */
          }
        }
        nlIdx = buffer.indexOf('\n');
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* already released */ }
  }
}

export class ChatAbortedError extends Error {
  constructor() {
    super('Chat request was aborted');
    this.name = 'ChatAbortedError';
  }
}

export interface ChatStreamOptions {
  message: string;
  signal?: AbortSignal;
}

/** Conversation state container. Calls go through the streaming SSE proxy so
 *  tokens land in the UI as they're produced; non-streaming `sendMessage` is
 *  kept for callers that just want the final string. */
export class OpenAIChat {
  private messages: ChatHistoryEntry[] = [];
  private systemInstruction: string;

  constructor(systemInstruction: string, initialHistory?: ChatHistoryEntry[]) {
    this.systemInstruction = systemInstruction;
    if (initialHistory) {
      this.messages = [...initialHistory];
    }
  }

  getHistory(): Array<{ role: string; parts: Array<{ text: string }> }> {
    return this.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }],
    }));
  }

  async sendMessage(options: { message: string }): Promise<{ text: string }> {
    this.messages.push({ role: 'user', content: options.message });
    const sent = capHistory(this.messages, CHAT_HISTORY_TAIL_TURNS);

    try {
      const response = await withTimeout(
        makeOpenAIRequest(sent, {
          systemMessage: this.systemInstruction,
          temperature: 0.5,
        }),
        CHAT_REQUEST_TIMEOUT_MS,
      );
      const assistantMessage = response.choices[0].message.content as string;
      this.messages.push({ role: 'assistant', content: assistantMessage });
      return { text: assistantMessage };
    } catch (error) {
      // Roll back the optimistic user push so the next attempt isn't double-counted.
      this.messages.pop();
      throw error;
    }
  }

  /** Yields incremental text deltas. The full assistant message is appended
   *  to history once the stream completes successfully. */
  async *sendMessageStream(
    options: ChatStreamOptions,
  ): AsyncGenerator<{ text: string }, void, unknown> {
    const { message, signal } = options;
    this.messages.push({ role: 'user', content: message });
    const sent = capHistory(this.messages, CHAT_HISTORY_TAIL_TURNS);

    // Build a Responses-API-shaped payload. The backend forwards this to
    // /v1/responses with stream:true. System prompt goes into `instructions`,
    // not into the `input` array (per OpenAI's streaming guide).
    const input = sent.map(m => ({ role: m.role, content: m.content }));

    // Local timeout that also aborts the network read. Caller's signal still
    // wins if it fires first.
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(
      () => timeoutController.abort(new DOMException('Timeout', 'AbortError')),
      CHAT_REQUEST_TIMEOUT_MS,
    );
    const compositeSignal = anySignal([signal, timeoutController.signal]);

    let response: Response;
    try {
      response = await fetch(OPENAI_STREAM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          model: CV_ANALYSIS_MODEL,
          input,
          instructions: this.systemInstruction,
          temperature: 0.5,
        }),
        signal: compositeSignal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      this.messages.pop();
      if ((err as Error)?.name === 'AbortError') throw new ChatAbortedError();
      throw err;
    }

    if (!response.ok) {
      clearTimeout(timeoutId);
      this.messages.pop();
      const errorText = await response.text().catch(() => '');
      throw new Error(`Chat stream error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    let assembled = '';
    let upstreamError: string | null = null;
    try {
      for await (const frame of readSSE(response, compositeSignal)) {
        if (typeof frame.error === 'string') {
          upstreamError = frame.error;
          break;
        }
        const delta = typeof frame.delta === 'string' ? frame.delta : '';
        if (!delta) continue;
        assembled += delta;
        yield { text: delta };
      }
    } catch (err) {
      clearTimeout(timeoutId);
      // Roll back the user push so retry won't double-record it.
      this.messages.pop();
      if ((err as Error)?.name === 'AbortError') throw new ChatAbortedError();
      throw err;
    }

    clearTimeout(timeoutId);

    if (upstreamError) {
      this.messages.pop();
      throw new Error(upstreamError);
    }

    this.messages.push({ role: 'assistant', content: assembled });
  }
}

/** Combine multiple AbortSignals into one — the result aborts as soon as any
 *  of the inputs aborts. Lets us layer per-call abort with a global timeout. */
function anySignal(signals: Array<AbortSignal | undefined>): AbortSignal {
  const controller = new AbortController();
  const filtered = signals.filter((s): s is AbortSignal => !!s);
  for (const s of filtered) {
    if (s.aborted) {
      controller.abort(s.reason);
      return controller.signal;
    }
    s.addEventListener(
      'abort',
      () => controller.abort(s.reason),
      { once: true },
    );
  }
  return controller.signal;
}

export function startChat(cvText: string, jdText: string): OpenAIChat {
  const systemInstruction = `You are an expert, friendly, and encouraging CV Coach. Your goal is to help a user improve their CV based on the provided CV and job description.
  
  You can answer questions, provide general advice, or give specific suggestions for improvement.
  When you have a specific suggestion to replace a piece of text in the CV, you MUST provide it as a JSON object on its own line, wrapped in \`\`\`json tags.
  The structure must be exactly: { "suggestion": { "original": "The exact text from the CV to be replaced.", "replacement": "The new, improved text you are suggesting." } }
  
  Keep your conversational text concise, positive, and helpful.

  Here is the context:
  - The user's current CV.`;

  const initialPrompt = `This is the user's CV:\n\n${cvText}\n\nThis is the job description:\n\n${jdText}`;
  
  const chat = new OpenAIChat(systemInstruction, [
    { role: 'user', content: initialPrompt }
  ]);
  
  return chat;
}

export function startCoachChat(cvText: string, jdText: string, improvementAreas: string[]): OpenAIChat {
  const firstArea = improvementAreas[0] ?? 'general improvements';

  const systemInstruction = `You are an expert CV Coach specialized in iterative improvement. Your mission is to guide users through targeted CV improvements based on their analysis results.

  **LANGUAGE POLICY:**
  - Default language: English (professional and clear)
  - Multilingual support: If the user replies in another language (Vietnamese, Chinese, Spanish, etc.), match it
  - Always be professional, encouraging, and helpful regardless of language

  **FORMATTING & STYLE (STRICT):**
  - Do NOT use emojis or decorative unicode icons
  - Keep messages concise (2-5 short sentences); use bullet points only when listing
  - Use plain English; minimal Markdown only when helpful (bold labels, hyphen bullets)
  - Maintain a neutral, professional tone — no exclamation-heavy or overly casual phrasing
  - When proposing text changes, use the exact JSON format defined below

  **CRITICAL — DO NOT RE-GREET:**
  - The chat UI has already shown a welcome message and the focus areas to the user
  - Do NOT introduce yourself, do NOT say "Hello", "Hi", or any opening pleasantry
  - Do NOT restate the list of focus areas
  - On your very first response, acknowledge briefly (≤ 1 short sentence) and dive directly into ${firstArea}

  **PROCESS 1: CV Improvement (Primary)**
  1.  Work through the focus areas in order, starting with: ${firstArea}.
  2.  Ask targeted questions to gather information needed to fix the weakness (e.g., asking for metrics to improve 'Quantification').
  3.  Suggest quick replies using the format: [QUICK_REPLIES:"Reply 1","Reply 2"]. Keep replies short (≤ 4 words).
  4.  Once you have enough info, propose specific text replacements.
  5.  You MUST provide each suggestion as a JSON object on its own line, wrapped in \`\`\`json tags. Structure: { "suggestion": { "original": "text to replace", "replacement": "new improved text" } }
  6.  **You MAY emit multiple \`\`\`json suggestion blocks in the same turn** when the focus area requires several distinct edits (e.g., 3 bullets that all need quantification). Each block becomes its own Approve/Reject card in the UI. Cap it at 4 suggestions per turn so the user is not overwhelmed.
  7.  After a suggestion is handled, move to the NEXT focus area. Stay concise.

  **PROCESS 2: Skill Gap & Course Recommendation (Secondary)**
  1.  Actively identify skills/technologies from the JD that are MISSING from the CV.
  2.  Ask the user about the gap (e.g., "The JD mentions 'Tableau'. I don't see that on your CV — do you have experience with it?").
  3.  If the user confirms they lack the skill, suggest 1-3 relevant online courses.
  4.  Provide course recommendations as a JSON object on its own line, wrapped in \`\`\`json tags.
  5.  Structure: { "course_recommendation": { "missing_skill": "The Skill Name", "courses": [ { "platform": "Udemy", "title": "Course Title" } ] } }
      - For each course, provide ONLY the 'platform' and 'title'. DO NOT include a 'url'.
  6.  Suggest courses from Udemy, Coursera, or DeepLearning.AI.
  7.  After a course recommendation, STOP that line of conversation. End with quick replies like [QUICK_REPLIES:"Got it","Thanks"]. Wait for the user to respond before introducing the next topic.`;

  const initialPrompt = `The chat UI has already greeted the user and shown the focus areas. The user is about to send their first reply.

CV:
${cvText}

Job Description:
${jdText}

Focus areas (work through in this order): ${improvementAreas.length ? improvementAreas.join(', ') : '(none — CV is well-aligned; offer general polish suggestions only when the user asks)'}

Behavior reminder:
- Do NOT re-greet, do NOT re-introduce yourself, do NOT restate the focus areas list.
- When the user replies, acknowledge briefly (≤ 1 sentence) and immediately work on: ${firstArea}.
- Always end with [QUICK_REPLIES:"...","..."] when waiting on the user.`;

  return new OpenAIChat(systemInstruction, [
    { role: 'user', content: initialPrompt },
  ]);
}
