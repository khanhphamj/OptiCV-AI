

import { GoogleGenAI, Type, Chat } from "@google/genai";
import { AnalysisResult, ValidationResult, StructuredJd } from '../types';
import { CV_ANALYSIS_MODEL } from '../constants';

// Ensure you have your API key set as an environment variable
const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

const subScoreDetailSchema = {
    type: Type.OBJECT,
    description: "A detailed breakdown for a specific metric.",
    properties: {
        score: { type: Type.INTEGER, description: "A score from 0 to 100 for this specific metric." },
        description: { type: Type.STRING, description: "A one-sentence explanation of why this score was given, based on the CV and JD." },
        improvement_tip: { type: Type.STRING, description: "A one-sentence, actionable tip for the user to improve this specific area." },
    },
    required: ["score", "description", "improvement_tip"]
};

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    suitability_score: { 
      type: Type.INTEGER, 
      description: "A score from 0 to 100 representing how well the CV matches the job description. Higher scores indicate a better match." 
    },
    overall_summary: { 
      type: Type.STRING, 
      description: "A brief, one-paragraph summary of the candidate's fit for the role, highlighting key qualifications and potential gaps." 
    },
    strengths: {
      type: Type.ARRAY,
      items: { 
        type: Type.STRING 
      },
      description: "A bulleted list of the top 3-5 key strengths and qualifications from the CV that strongly align with the job description's requirements."
    },
    improvement_areas: {
      type: Type.ARRAY,
      items: { 
        type: Type.STRING 
      },
      description: "A bulleted list of the top 3-5 specific, actionable suggestions for improving the CV to better match the job description. Focus on missing keywords, skills, or quantifiable achievements."
    },
    sub_scores: {
      type: Type.OBJECT,
      description: "A detailed breakdown of scores for specific metrics.",
      properties: {
        keyword_match: subScoreDetailSchema,
        experience_fit: subScoreDetailSchema,
        skill_coverage: subScoreDetailSchema,
        quantification: subScoreDetailSchema,
      },
      required: ["keyword_match", "experience_fit", "skill_coverage", "quantification"]
    }
  },
  required: ["suitability_score", "overall_summary", "strengths", "improvement_areas", "sub_scores"]
};

const validationSchema = {
  type: Type.OBJECT,
  properties: {
    is_cv_valid: {
      type: Type.BOOLEAN,
      description: "Is the first text a valid CV or resume?"
    },
    cv_reason: {
      type: Type.STRING,
      description: "If is_cv_valid is false, a brief one-sentence explanation of why (e.g., 'It appears to be a job description', 'It contains nonsensical text'). Provide null if valid."
    },
    is_jd_valid: {
      type: Type.BOOLEAN,
      description: "Is the second text a valid Job Description?"
    },
    jd_reason: {
      type: Type.STRING,
      description: "If is_jd_valid is false, a brief one-sentence explanation of why (e.g., 'It appears to be a CV', 'It does not seem to describe a job role'). Provide null if valid."
    }
  },
  required: ["is_cv_valid", "cv_reason", "is_jd_valid", "jd_reason"]
};

const structuredJdSchema = {
    type: Type.OBJECT,
    properties: {
        job_title: { type: Type.STRING, description: "The job title (e.g., 'Senior Software Engineer')." },
        company_name: { type: Type.STRING, description: "The name of the company hiring. Can be null if not found." },
        
        location: { type: Type.STRING, description: "The work location (e.g., 'Ho Chi Minh City, Vietnam', 'Remote'). Can be null." },
        work_type: { type: Type.STRING, description: "The type of employment (e.g., 'Full-time', 'Part-time', 'Contract'). Can be null." },
        salary: { type: Type.STRING, description: "The stated salary or salary range. Use 'Negotiable' if not specified. Can be null." },
        experience_required: { type: Type.STRING, description: "The required years of experience (e.g., '3+ years'). Can be null." },
        education_required: { type: Type.STRING, description: "The general education level required (e.g., 'Bachelor's Degree'). Can be null." },

        job_summary: { type: Type.STRING, description: "A brief, 2-3 sentence overview of the position and its role in the company." },
        key_responsibilities: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of the main tasks and duties for the role."
        },
        
        requirements: {
            type: Type.OBJECT,
            description: "Candidate requirements, split into mandatory and preferred.",
            properties: {
                mandatory: {
                    type: Type.OBJECT,
                    description: "Mandatory requirements for the candidate.",
                    properties: {
                        education: { type: Type.STRING, description: "Specific degree or educational requirement (e.g., 'Bachelor's degree in Computer Science'). Can be null." },
                        experience: { type: Type.STRING, description: "Specific experience requirements (e.g., '5 years of experience in mobile development'). Can be null." },
                        technical_skills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of mandatory technical skills (e.g., 'React', 'Node.js')." },
                        languages: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Required languages (e.g., 'Fluent in English')." },
                    },
                    required: ["education", "experience", "technical_skills", "languages"]
                },
                preferred: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "A list of preferred or 'nice-to-have' skills and qualifications."
                }
            },
            required: ["mandatory", "preferred"]
        },
        
        benefits: {
            type: Type.OBJECT,
            description: "Benefits and perks offered, split into categories.",
            properties: {
                salary_and_bonus: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Details on base salary, performance bonuses, and allowances." },
                welfare: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Details on insurance, healthcare, leave policies, training, and other welfare benefits." },
            },
            required: ["salary_and_bonus", "welfare"]
        },
        
        application_info: {
            type: Type.OBJECT,
            description: "Information on how to apply.",
            properties: {
                deadline: { type: Type.STRING, description: "Application deadline. Can be null." },
                vacancies: { type: Type.STRING, description: "Number of people to hire (e.g., '1', 'Multiple'). Can be null." },
                contact: { type: Type.STRING, description: "Contact person or email for applications. Can be null." },
                how_to_apply: { type: Type.STRING, description: "Instructions on how to submit the application. Can be null." }
            },
            required: ["deadline", "vacancies", "contact", "how_to_apply"]
        },

        required_documents: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of documents required for the application (e.g., 'CV', 'Cover Letter')."
        },

        company_summary: { type: Type.STRING, description: "A brief, 2-3 sentence introduction about the company. Can be null." },

        why_choose_us: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of reasons why a candidate should join the company."
        }
    },
    required: ["job_title", "company_name", "location", "work_type", "salary", "experience_required", "education_required", "job_summary", "key_responsibilities", "requirements", "benefits", "application_info", "required_documents", "company_summary", "why_choose_us"]
};

// Timeout wrapper for API calls
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms)
    )
  ]);
};

export async function validateDocuments(cvText: string, jdText: string): Promise<ValidationResult> {
  const systemInstruction = `You are a document validation expert. Your task is to determine if the two provided texts correspond to a CV and a Job Description (JD).
  - The first text should be a CV/resume.
  - The second text should be a Job Description.
  - Be strict. If the text is nonsensical, too short, or clearly the wrong document type, flag it as invalid.
  - Respond ONLY with a valid JSON object adhering to the provided schema. Do not add any extra text or markdown.`;

  const prompt = `
    Please validate the following documents.

    **CV_TEXT:**
    ---
    ${cvText.substring(0, 2000)} 
    ---

    **JD_TEXT:**
    ---
    ${jdText.substring(0, 2000)}
    ---
  `;
  
  try {
    const apiCall = ai.models.generateContent({
      model: CV_ANALYSIS_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: validationSchema,
        temperature: 0.0,
      }
    });

    const response = await withTimeout(apiCall, 30000); // 30 second timeout
    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return result as ValidationResult;

  } catch (error) {
    console.error("Error calling Gemini API for validation:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Validation Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while validating documents with the AI.");
  }
}


export async function analyzeCv(cvText: string, jdText: string): Promise<AnalysisResult> {
  const systemInstruction = `You are an expert CV and Job Description analyzer for a CV optimization tool. Your task is to meticulously compare a candidate's CV against a provided job description.
  Your analysis must be objective, constructive, and strictly focused on the content of the two documents.
  For sub_scores, provide a concise but insightful 'description' explaining the score and an 'improvement_tip' that is immediately actionable for the user.
  You MUST respond ONLY with a valid JSON object that adheres to the provided schema. Do not add any introductory text, markdown formatting, or explanations outside of the JSON structure.`;

  const prompt = `
    Please analyze the following CV and Job Description.

    **CV TEXT:**
    ---
    ${cvText}
    ---

    **JOB DESCRIPTION TEXT:**
    ---
    ${jdText}
    ---
  `;
  
  try {
    const apiCall = ai.models.generateContent({
      model: CV_ANALYSIS_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2, // Lower temperature for more deterministic, factual analysis
      }
    });

    const response = await withTimeout(apiCall, 45000); // 45 second timeout for analysis
    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return result as AnalysisResult;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
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

    const prompt = `
      Please parse the following Job Description text into a structured JSON object.

      **JOB DESCRIPTION TEXT:**
      ---
      ${jdText}
      ---
    `;

    try {
        const apiCall = ai.models.generateContent({
            model: CV_ANALYSIS_MODEL,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: structuredJdSchema,
                temperature: 0.1,
            }
        });
        
        const response = await withTimeout(apiCall, 30000); // 30 second timeout
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as StructuredJd;
    } catch (error) {
        console.error("Error calling Gemini API for JD structuring:", error);
        if (error instanceof Error) {
            throw new Error(`Gemini API Structuring Error: ${error.message}`);
        }
        throw new Error("An unknown error occurred while structuring the Job Description with the AI.");
    }
}

export function startChat(cvText: string, jdText: string): Chat {
  const systemInstruction = `You are an expert, friendly, and encouraging CV Coach. Your goal is to help a user improve their CV based on the provided CV and job description.
  
  You can answer questions, provide general advice, or give specific suggestions for improvement.
  When you have a specific suggestion to replace a piece of text in the CV, you MUST provide it as a JSON object on its own line, wrapped in \`\`\`json tags.
  The structure must be exactly: { "suggestion": { "original": "The exact text from the CV to be replaced.", "replacement": "The new, improved text you are suggesting." } }
  
  Keep your conversational text concise, positive, and helpful.

  Here is the context:
  - The user's current CV.
  - The target job description.`;

  const initialPrompt = `This is the user's CV:\n\n${cvText}\n\nThis is the job description:\n\n${jdText}`;
  
  const chat: Chat = ai.chats.create({
    model: CV_ANALYSIS_MODEL,
    config: {
      systemInstruction,
      temperature: 0.5,
    },
    history: [
      {
        role: "user",
        parts: [{ text: initialPrompt }]
      },
    ]
  });
  return chat;
}

export function startCoachChat(cvText: string, jdText: string, improvementAreas: string[]): Chat {
  const systemInstruction = `You are an expert, friendly, and encouraging CV Coach. Your dual goal is to guide a user to improve their CV and identify skill gaps.
  
  **PROCESS 1: CV Improvement (Primary)**
  1.  Start with the FIRST improvement area from the provided list. Greet the user and introduce the topic.
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
  - A list of improvement areas to work through, in order.`;

  const initialPrompt = `This is the user's CV:\n\n${cvText}\n\nThis is the job description:\n\n${jdText}\n\nHere are the improvement areas to address, one by one:\n- ${improvementAreas.join('\n- ')}`;
  
  let initialModelResponse: string;

  if (improvementAreas.length > 0) {
    const firstImprovement = improvementAreas[0] || "making your CV stronger";
    initialModelResponse = `Hi! I'm your CV Coach. I've analyzed your documents and I'm ready to help you make your CV even better.\nLet's begin with our first area for improvement: **${firstImprovement}**.\nTo get started, could you tell me a bit more about your experience related to this point? [QUICK_REPLIES:"Sure, I can tell you more.","Can you give me an example?","I don't have that information."]`;
  } else {
    initialModelResponse = `Hi! I'm your CV Coach. Your CV has achieved a high suitability score, which is excellent work! This indicates a very strong match with the job description.\nWhile there are no major improvement areas flagged, is there anything specific you'd like to refine or discuss further? [QUICK_REPLIES:"Let's review my summary.","Any final tips?","No, I'm happy with it."]`;
  }


  const chat: Chat = ai.chats.create({
    model: CV_ANALYSIS_MODEL,
    config: {
      systemInstruction,
      temperature: 0.5,
    },
    history: [
      {
        role: "user",
        parts: [{ text: initialPrompt }]
      },
      {
        role: "model",
        parts: [{ text: initialModelResponse }]
      }
    ]
  });
  return chat;
}