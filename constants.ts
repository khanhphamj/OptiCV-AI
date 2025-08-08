
import { Step, StepConfig } from './types';

export const STEPS: StepConfig[] = [
  { id: Step.UploadCV, name: 'Upload CV' },
  { id: Step.UploadJD, name: 'Upload Job Description' },
  { id: Step.Analysis, name: 'Analysis & Optimization' },
];

export const CV_ANALYSIS_MODEL = 'gpt-4.1-mini-2025-04-14';
