export interface Skill {
  name: string;
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  category: string[]; // Changed from string to string[] for nesting
}

export interface SkillGap extends Skill {
  isGap: boolean;
}

export interface RoadmapStep {
  title: string;
  duration: string; // e.g., "Weeks 1-2"
  skillsToLearn: string[];
  suggestedResources: {
    name: string;
    url: string;
    type: 'Course' | 'Article' | 'Video' | 'Documentation' | 'Book' | 'Podcast';
  }[];
  milestoneProject: string;
  completed: boolean;
}

export interface ProjectSuggestion {
  title: string;
  description: string;
  requiredSkills: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  xp: number;
}

export interface ProjectStep {
  title: string;
  description: string;
  completed: boolean;
}

export interface UserProject extends ProjectSuggestion {
  status: 'Not Started' | 'In Progress' | 'Completed';
  notes?: string;
  projectUrl?: string;
  projectPlan?: ProjectStep[];
}

export type TrendType = 'Current' | 'Future';

export interface Trend {
  title: string;
  summary: string;
  type: TrendType;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    sources?: { title: string; url: string }[];
}

export interface ChatSession {
    date: string;
    mode: string;
    messages: ChatMessage[];
}


export interface InterviewSession {
    date: string;
    targetRole: string;
    transcript: ChatMessage[];
    feedbackSummary: string;
}

export interface QuizQuestion {
  question: string;
  type: 'mcq'; // For now, only multiple choice is supported
  options: string[];
  answer: string;
  explanation: string;
}

export interface QuizSession {
    date: string;
    targetRole: string;
    topics: string[];
    questions: { question: QuizQuestion; userAnswer: string; isCorrect: boolean }[];
    score: number; // percentage
}


export interface VoiceSession {
    date: string;
    transcript: { speaker: 'user' | 'model'; text: string }[];
    keyTakeaways: string;
}

export interface Achievement {
  id: string; // Unique identifier for the achievement
  name: string;
  description: string;
  icon: string; // emoji
}

export type TrackedJobStatus = 'Applied' | 'Interviewing' | 'Offered' | 'Rejected' | 'Tentative';

export interface JobPosting {
    title: string;
    company: string;
    location: string;
    url: string;
    description: string;
}

export interface TrackedJob extends JobPosting {
    status: TrackedJobStatus;
}


export interface UserProfile {
  id?: string;
  name: string;
  age: number;
  profession: string;
  educationLevel: string;
  targetRole: string;
  xp: number;
  level: number;
  streak: number;
  skills: SkillGap[];
  roadmap: RoadmapStep[];
  projects: UserProject[];
  achievements: Achievement[];
  trends: Trend[];
  trackedJobs?: TrackedJob[];
  githubUrl?: string;
  linkedinUrl?: string;
  interviewHistory: InterviewSession[];
  voiceMentorHistory: VoiceSession[];
  quizHistory: QuizSession[];
  smartChatHistory: ChatSession[];
}

export interface ResumeFeedback {
    overallScore: number;
    feedbackSections: {
        title: string;
        score: number;
        feedback: string;
        suggestions: string[];
    }[];
    finalSummary: string;
    suggestedBullets: string[];
}

export interface Course {
    title: string;
    description: string;
    url: string;
    type: 'Online' | 'Local';
    rating?: number;
}