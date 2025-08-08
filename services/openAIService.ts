import { AnalysisResult, ValidationResult, StructuredJd, ChatMessage } from '../types';
import { CV_ANALYSIS_MODEL } from '../constants';

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable not set.");
}

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

// Timeout wrapper function
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

// OpenAI API request helper
async function makeOpenAIRequest(messages: any[], options: {
  temperature?: number;
  responseFormat?: any;
  systemMessage?: string;
} = {}) {
  const { temperature = 0.2, responseFormat, systemMessage } = options;
  
  const requestMessages = [];
  
  if (systemMessage) {
    requestMessages.push({
      role: 'system',
      content: systemMessage
    });
  }
  
  requestMessages.push(...messages);

  const requestBody: any = {
    model: CV_ANALYSIS_MODEL,
    messages: requestMessages,
    temperature,
  };

  // Add response format for structured outputs
  if (responseFormat) {
    requestBody.response_format = responseFormat;
  }

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} ${response.statusText} - ${errorText}`);
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
      description: "Detailed breakdown of specific metrics.",
      properties: {
        keyword_match: subScoreDetailSchema,
        experience_fit: subScoreDetailSchema,
        skill_coverage: subScoreDetailSchema,
        quantification: subScoreDetailSchema,
      },
      required: ["keyword_match", "experience_fit", "skill_coverage", "quantification"],
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
  const systemInstruction = `You are an expert CV and Job Description analyzer for a CV optimization tool. Your task is to meticulously compare a candidate's CV against a provided job description.
  Your analysis must be objective, constructive, and strictly focused on the content of the two documents.
  For sub_scores, provide a concise but insightful 'description' explaining the score and an 'improvement_tip' that is immediately actionable for the user.
  You MUST respond ONLY with a valid JSON object that adheres to the provided schema. Do not add any introductory text, markdown formatting, or explanations outside of the JSON structure.`;

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

    const response = await withTimeout(apiCall, 60000);
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
        
        const response = await withTimeout(apiCall, 60000);
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

// Chat class for managing conversations
export class OpenAIChat {
  private messages: Array<{ role: string; content: string }> = [];
  private systemInstruction: string;

  constructor(systemInstruction: string, initialHistory?: Array<{ role: string; content: string }>) {
    this.systemInstruction = systemInstruction;
    if (initialHistory) {
      this.messages = [...initialHistory];
    }
  }

  getHistory(): Array<{ role: string; parts: Array<{ text: string }> }> {
    // Convert to format expected by existing code
    return this.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }]
    }));
  }

  async sendMessage(options: { message: string }): Promise<{ text: string }> {
    this.messages.push({ role: 'user', content: options.message });

    try {
      const response = await makeOpenAIRequest(this.messages, {
        systemMessage: this.systemInstruction,
        temperature: 0.5
      });

      const assistantMessage = response.choices[0].message.content;
      this.messages.push({ role: 'assistant', content: assistantMessage });

      return { text: assistantMessage };
    } catch (error) {
      console.error("Error in chat:", error);
      throw error;
    }
  }

  async *sendMessageStream(options: { message: string }): AsyncGenerator<{ text: string }, void, unknown> {
    // For simplicity, we'll use the regular sendMessage and yield the full response
    // In a real implementation, you might want to implement streaming
    const response = await this.sendMessage(options);
    yield response;
  }
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
  const systemInstruction = `You are an expert CV Coach specialized in iterative improvement. Your mission is to guide users through targeted CV improvements based on their analysis results.

  **LANGUAGE POLICY:**
  - Default language: English (professional and clear)
  - Multilingual support: If user requests or communicates in another language (Vietnamese, Chinese, Spanish, etc.), respond in that language
  - Language flexibility: Adapt to user's preferred language while maintaining coaching quality
  - Always be professional, encouraging, and helpful regardless of language

  **FORMATTING & STYLE (STRICT):**
  - Do NOT use emojis, decorative unicode icons, or excessive punctuation
  - Keep messages concise (2-5 short sentences), then use bullet points only when listing
  - Use plain English; minimal Markdown only when helpful (bold section labels, hyphen bullets)
  - Maintain a neutral, professional tone; avoid exclamation-heavy or overly casual phrasing
  - When proposing text changes, continue to use the exact JSON format specified below
  
  **PROCESS 1: CV Improvement (Primary)**
  1.  Start with the FIRST improvement area from the provided list. Greet the user warmly and introduce the topic.
  2.  Ask targeted questions to get information to fix the weakness (e.g., asking for metrics to improve 'Quantification').
  3.  Optionally, suggest quick replies using the format: [QUICK_REPLIES:"Reply 1","Reply 2"].
  4.  Once you have info, provide a specific text replacement suggestion.
  5.  You MUST provide this suggestion as a JSON object on its own line, wrapped in \`\`\`json tags. Structure: { "suggestion": { "original": "text to replace", "replacement": "new improved text" } }
  6.  After a suggestion is handled, move to the NEXT improvement area. Keep your text concise and focused.
  
  **PROCESS 2: Skill Gap & Course Recommendation (Secondary)**
  1.  While conversing, actively identify specific skills/technologies from the Job Description that are MISSING from the CV.
  2.  When you find a gap, ask the user about it (e.g., "The JD mentions 'Tableau'. I don't see that on your CV. Do you have experience with it?").
  3.  If the user confirms they lack the skill, you MUST suggest they learn it by providing a list of relevant online courses.
  4.  Provide course recommendations as a JSON object on its own line, wrapped in \`\`\`json tags.
  5.  The structure must be exactly: { "course_recommendation": { "missing_skill": "The Skill Name", "courses": [ { "platform": "Udemy", "title": "Course Title" }, { "platform": "Coursera", "title": "Course Title" } ] } }
      - For each course, provide ONLY the 'platform' and 'title'. DO NOT provide a 'url'.
  6.  Suggest 1-3 high-quality, relevant courses from Udemy, Coursera, or DeepLearning.com.
  7.  **CRITICAL RULE**: After providing a course recommendation, STOP your current line of conversation. Your entire message should be focused on introducing the skill gap and providing the course suggestion JSON. End the message with quick replies like [QUICK_REPLIES:"Got it, let's continue","Thanks for the tip!"]. Wait for the user to respond before you introduce the next topic.
  
  Here is the context:
  - The user's current CV.
  - The target job description.
  - A list of improvement areas to work through, in order.
  
  For your FIRST message, greet the user warmly and introduce yourself as their CV Coach. Then start working on the first improvement area.`;

  const initialPrompt = `Hello! I'm ready to help you improve your CV. Here's what I'll be working with:

CV:\n${cvText}\n\nJob Description:\n${jdText}\n\nImprovement Areas: ${improvementAreas.join(', ')}

Please start by greeting me and introducing the first improvement area we should work on.`;
  
  // Create initial conversation with proper initialization
  const chat = new OpenAIChat(systemInstruction, [
    { role: 'user', content: initialPrompt }
  ]);
  
  return chat;
}
