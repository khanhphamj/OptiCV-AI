

export enum Step {
  UploadCV = 1,
  UploadJD = 2,
  Analysis = 3,
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
  keyword_match: SubScoreDetail;
  experience_fit: SubScoreDetail;
  skill_coverage: SubScoreDetail;
  quantification: SubScoreDetail;
}

export interface AnalysisResult {
  suitability_score: number;
  overall_summary: string;
  strengths: string[];
  improvement_areas: string[];
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
  suggestion?: AISuggestion;
  courseRecommendation?: CourseRecommendation;
  quickReplies?: string[];
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