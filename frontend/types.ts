

export enum Step {
  UploadCV = 1,
  UploadJD = 2,
  Analysis = 3,
  ReviewProfile = 4,
  JobMatches = 5,
}

export type JobLocation = 'ho_chi_minh' | 'ha_noi';

export interface CvProfile {
  title: string | null;
  role: string | null;
  level: string | null;
  location: JobLocation | null;
  skills: string[];
  years_experience: number | null;
}

export interface JobListing {
  url: string;
  title: string;
  snippet: string;
  source: string;
  tavily_score?: number | null;
}

export interface JobMatch {
  url: string;
  title: string;
  company: string | null;
  location: string | null;
  source: string;
  match_score: number;
  match_reasons: string[];
  skill_gaps: string[];
  jd_excerpt: string;
}

export interface StepConfig {
  id: Step;
  name: string;
}

export interface SubScoreDetail {
  score: number;
  description: string;
  improvement_tip: string;
}

export interface SubScores {
  /** How closely the candidate's CURRENT/most recent title and responsibilities
   *  match the JD title and seniority. The single highest-signal filter HR
   *  applies in the first 6-10 seconds of scanning. */
  role_alignment?: SubScoreDetail;
  /** Required + nice-to-have skills coverage, with recency weighting baked in. */
  skill_coverage: SubScoreDetail;
  /** Years of experience AND seniority-band fit (junior CV for senior JD scores
   *  low even if the year count is right). */
  experience_fit: SubScoreDetail;
  /** Whether matching skills/experience are recent (≤3 years) or stale (5+ years). */
  recency?: SubScoreDetail;
  /** Real quantified impact — scope, scale, business outcome — not just
   *  "has numbers". A trivial metric still scores low. */
  quantification: SubScoreDetail;
  /** Lexical overlap with JD keywords. Useful as an ATS proxy but a weaker
   *  signal of actual fit, so weighted lower than the others. */
  keyword_match: SubScoreDetail;
}

export interface AnalysisResult {
  suitability_score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  sub_scores: SubScores;
}

export interface StructuredJd {
  job_title: string | null;
  company_name: string | null;
  
  // Position Information
  location: string | null;
  work_type: string | null;
  salary: string | null;
  experience_required: string | null;
  education_required: string | null;
  
  // Job Description
  job_summary: string | null;
  key_responsibilities: string[];
  
  // Candidate Requirements
  requirements: {
    mandatory: {
      education: string | null;
      experience: string | null;
      technical_skills: string[];
      languages: string[];
    };
    preferred: string[];
  };
  
  // Benefits & Perks
  benefits: {
    salary_and_bonus: string[];
    welfare: string[];
  };
  
  // Application Information
  application_info: {
    deadline: string | null;
    vacancies: string | null;
    contact: string | null;
    how_to_apply: string | null;
  };
  
  required_documents: string[];
  
  // About the Company
  company_summary: string | null;
  why_choose_us: string[];
}


export interface AISuggestion {
  original: string;
  replacement: string;
}

export interface Course {
  platform: 'Udemy' | 'Coursera' | 'DeepLearning.com' | string;
  title: string;
}

export interface CourseRecommendation {
  missing_skill: string;
  courses: Course[];
}

export interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  /** Each suggestion renders as its own Approve/Reject card stacked under
   *  the message bubble. Multiple are emitted when the agent proposes
   *  several edits in one turn. */
  suggestions?: AISuggestion[];
  /** Multiple skill-gap course recommendations may be attached to a single
   *  message — each renders as its own card. */
  courseRecommendations?: CourseRecommendation[];
  quickReplies?: string[];
  /** Optional focus areas — rendered as visual chips below the bubble (welcome message). */
  tasks?: string[];
  timestamp: Date;
}

export interface ImprovementLog {
  id: string | number;
  taskName: string;
  description: string;
  originalText: string;
  replacementText: string;
  timestamp: Date;
}

export interface AnalysisSession {
    id: number;
    timestamp: Date;
    scoreBefore: number | null; // null for the very first run
    scoreAfter: number;
    improvements: ImprovementLog[];
}

export interface ValidationResult {
  is_cv_valid: boolean;
  cv_reason: string | null;
  is_jd_valid: boolean;
  jd_reason: string | null;
}

export type CoverLetterTone = 'professional' | 'enthusiastic' | 'concise' | 'friendly' | 'formal';

export interface CoverLetterResult {
  letter: string;
  tone_used: CoverLetterTone;
}