import { CvProfile, JobListing, JobLocation, JobMatch } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
const JOBS_SEARCH_ENDPOINT = `${API_BASE_URL}/api/jobs/search`;
const JOBS_MATCH_ENDPOINT = `${API_BASE_URL}/api/jobs/extract-and-match`;
const JOBS_FETCH_JD_ENDPOINT = `${API_BASE_URL}/api/jobs/fetch-jd`;

export interface JobSearchParams {
  title: string | null;
  role: string | null;
  level: string | null;
  location: JobLocation;
  maxResults?: number;
}

export interface JobSearchResult {
  query: string;
  locationLabel: string;
  results: JobListing[];
}

export async function searchJobs(params: JobSearchParams): Promise<JobSearchResult> {
  const response = await fetch(JOBS_SEARCH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: params.title,
      role: params.role,
      level: params.level,
      location: params.location,
      max_results: params.maxResults ?? 10,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Job search error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    query: data.query,
    locationLabel: data.location_label,
    results: data.results as JobListing[],
  };
}

export async function matchJobsToCv(cvText: string, listings: JobListing[]): Promise<JobMatch[]> {
  const response = await fetch(JOBS_MATCH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cv_text: cvText,
      listings: listings.map(l => ({ url: l.url, title: l.title, snippet: l.snippet })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Job match error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return (data.matches ?? []) as JobMatch[];
}

export interface FetchedJd {
  url: string;
  content: string;
  extracted: boolean;
}

export async function fetchJdContent(
  url: string,
  fallbackSnippet?: string,
  fallbackTitle?: string,
): Promise<FetchedJd> {
  const response = await fetch(JOBS_FETCH_JD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      fallback_snippet: fallbackSnippet,
      fallback_title: fallbackTitle,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fetch JD error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return { url: data.url, content: data.content, extracted: !!data.extracted };
}

export function buildSearchParams(profile: CvProfile, location: JobLocation): JobSearchParams {
  return {
    title: profile.title,
    role: profile.role,
    level: profile.level,
    location,
    maxResults: 10,
  };
}
