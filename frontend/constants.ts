
import { Step, StepConfig } from './types';

export const STEPS: StepConfig[] = [
  { id: Step.UploadCV, name: 'Upload CV' },
  { id: Step.UploadJD, name: 'Upload Job Description' },
  { id: Step.Analysis, name: 'Analysis & Optimization' },
];

export const FIND_JOBS_STEPS: StepConfig[] = [
  { id: Step.UploadCV, name: 'Upload CV' },
  { id: Step.ReviewProfile, name: 'Xác nhận hồ sơ' },
  { id: Step.JobMatches, name: 'Việc phù hợp' },
];

export const CV_ANALYSIS_MODEL = 'gpt-4.1-mini-2025-04-14';

export const JOB_MATCH_THRESHOLD = 70;
