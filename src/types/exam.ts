// User types
export interface User {
  id: string;
  username: string;
  role: 'teacher' | 'student';
  created_at: string;
}

// Question types - NOW INCLUDES TRUE/FALSE
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'code';

// Base question interface
export interface BaseQuestion {
  id: string;
  type: QuestionType;
  question: string;
  points: number;
  image_url?: string;
}

// Multiple Choice Question
export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  options: string[];
  correct_answer: string;
}

// True/False Question
export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true_false';
  correct_answer: 'true' | 'false';
}

// Short Answer Question
export interface ShortAnswerQuestion extends BaseQuestion {
  type: 'short_answer';
  correct_answer: string;
}

// Essay Question
export interface EssayQuestion extends BaseQuestion {
  type: 'essay';
  min_words?: number;
  max_words?: number;
}

// Code Question
export interface CodeQuestion extends BaseQuestion {
  type: 'code';
  language: 'python' | 'java' | 'c' | 'cpp' | 'javascript';
  starter_code?: string;
  test_cases?: Array<{
    input: string;
    expected_output: string;
  }>;
}

// Union type for all questions
export type Question = 
  | MultipleChoiceQuestion 
  | TrueFalseQuestion
  | ShortAnswerQuestion 
  | EssayQuestion 
  | CodeQuestion;

// Exam interface
export interface Exam {
  id: string;
  title: string;
  description?: string;
  time_limit: number;
  duration_minutes?: number;
  passing_score: number;
  questions: Question[];
  status: 'draft' | 'published';
  created_by: string;
  created_at: string;
  updated_at?: string;
  exam_code?: string;
  max_tab_switches?: number;
  auto_fail_on_cheat?: boolean;
  tab_switch_deduct_points?: number;
}

// Submission interfaces
export interface Answer {
  question_id: string;
  answer: string | string[];
  is_correct?: boolean;
  points_earned?: number;
}

export interface Submission {
  id: string;
  exam_id: string;
  student_id: string;
  answers: Answer[];
  total_score?: number;
  status: 'in_progress' | 'submitted' | 'graded' | 'failed';
  started_at: string;
  submitted_at?: string;
  tab_switches: number;
  ai_detection_results?: {
    question_id: string;
    likelihood: number;
    reasoning: string;
  }[];
}

// API Response types
export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ApiError {
  detail: string;
}