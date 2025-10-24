export interface Skill {
  name: string;
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  category: string; // Changed from enum to string for flexibility
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

export interface FutureTrend {
  skill: string;
  reason: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    sources?: { title: string; url: string }[];
}

export interface InterviewSession {
    date: string;
    targetRole: string;
    transcript: ChatMessage[];
    feedbackSummary: string;
}

export interface VoiceSession {
    date: string;
    transcript: { speaker: 'user' | 'model'; text: string }[];
    keyTakeaways: string;
}

export interface Achievement {
  name: string;
  description: string;
  icon: string; // emoji
}

export interface UserProfile {
  id?: string;
  name: string;
  targetRole: string;
  xp: number;
  level: number;
  streak: number;
  skills: SkillGap[];
  roadmap: RoadmapStep[];
  projects: UserProject[];
  achievements: Achievement[];
  futureTrends: FutureTrend[];
  githubUrl?: string;
  linkedinUrl?: string;
  interviewHistory: InterviewSession[];
  voiceMentorHistory: VoiceSession[];
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

export interface JobPosting {
    title: string;
    company: string;
    location: string;
    url: string;
    description: string;
}
