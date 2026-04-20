export interface Answer {
  question_id: string;
  answer: string | string[];
  is_correct?: boolean;
  points_earned?: number;
}

export interface IndividualScore {
  score: number;
  max_score: number;
  is_correct?: boolean;
  feedback?: string;
  ai_detected?: boolean;
  ai_confidence?: number;
}

export interface Submission {
  id: string;
  exam_id: string;
  student_id: string;
  student_username?: string;
  student_full_name?: string;
  student_id_number?: string; // e.g. "2021-12345"
  student_major?: string;     // e.g. "Computer Science"
  answers: Record<string, string>;
  total_score?: number | null;
  status: 'in_progress' | 'submitted' | 'graded' | 'failed' | 'completed';
  created_at: string;
  started_at?: string;
  submitted_at?: string;
  tab_switches: number;
  behavior_score?: number;
  individual_scores?: Record<string, IndividualScore>;
  ai_grading_results?: Record<string, any>;
  plagiarism_results?: Record<string, any>;
  ai_detection_results?: {
    question_id: string;
    likelihood: number;
    reasoning: string;
  }[];
}

export interface SubmissionResponse {
  id: string;
  exam_id: string;
  student_id: string;
  student_id_number?: string;
  student_major?: string;
  answers: Record<string, string>;
  total_score?: number | null;
  status: string;
  created_at: string;
  tab_switches: number;
  behavior_score?: number;
  individual_scores?: Record<string, IndividualScore>;
  ai_grading_results?: Record<string, any>;
  plagiarism_results?: Record<string, any>;
}