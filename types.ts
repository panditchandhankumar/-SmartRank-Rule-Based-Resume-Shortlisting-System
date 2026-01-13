export interface Skill {
  id: string;
  name: string;
  isMandatory: boolean;
}

export interface JobDescription {
  title: string;
  minExperience: number;
  educationLevel: string;
  mandatorySkills: string[];
  optionalSkills: string[];
  certifications: string[];
}

export interface CandidateData {
  id: string;
  name: string;
  rawText: string;
  fileName?: string;
  isParsing?: boolean;
}

export interface ExtractedCandidate {
  id: string;
  name: string;
  experienceYears: number;
  education: string;
  skillsFound: string[];
  certificationsFound: string[];
  usedFallback?: boolean;
}

export interface ScoreBreakdown {
  mandatorySkillsScore: number;
  optionalSkillsScore: number;
  experienceScore: number;
  educationScore: number;
  certificationScore: number;
  totalScore: number;
  isQualified: boolean;
}

export interface RankedCandidate extends ExtractedCandidate {
  score: ScoreBreakdown;
}

export enum EducationLevel {
  HighSchool = 1,
  Associate = 2,
  Bachelor = 3,
  Master = 4,
  PhD = 5
}

export const EDUCATION_WEIGHTS: Record<string, number> = {
  "High School": 1,
  "Associate": 2,
  "Bachelor": 3,
  "Master": 4,
  "PhD": 5
};