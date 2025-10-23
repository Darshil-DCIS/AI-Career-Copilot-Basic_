
export interface Skill {
  name: string;
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  category: 'Programming Language' | 'Framework/Library' | 'Tool' | 'Soft Skill' | 'Concept';
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
    type: 'Course' | 'Article' | 'Video' | 'Documentation';
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

export interface UserProject extends ProjectSuggestion {
  status: 'Not Started' | 'In Progress' | 'Completed';
}

export interface FutureTrend {
  skill: string;
  reason: string;
}

export interface UserProfile {
  name: string;
  targetRole: string;
  xp: number;
  level: number;
  streak: number;
  skills: SkillGap[];
  roadmap: RoadmapStep[];
  projects: UserProject[];
  achievements: string[];
  futureTrends: FutureTrend[];
  githubUrl?: string;
  linkedinUrl?: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
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
}
