import type { UserProfile, Achievement } from '../types';

export const ALL_ACHIEVEMENTS: Achievement[] = [
    // Project Achievements
    { id: 'PROJECT_STARTER', name: 'Project Starter', icon: '🚀', description: 'Began your first project.' },
    { id: 'PROJECT_FINISHER', name: 'Project Finisher', icon: '✅', description: 'Completed your first project.' },
    { id: 'TRIPLE_THREAT', name: 'Triple Threat', icon: '🎯', description: 'Completed 3 projects.' },
    { id: 'HARD_MODE', name: 'Hard Mode', icon: '🏆', description: 'Completed a "Hard" difficulty project.' },

    // Roadmap Achievements
    { id: 'FIRST_STEP', name: 'First Step', icon: '👟', description: 'Completed your first roadmap step.' },
    { id: 'HALFWAY_THERE', name: 'Halfway There', icon: ' halfway:', description: 'Completed 50% of your roadmap.' },
    { id: 'ROADMAP_COMPLETE', name: 'Journey\'s End', icon: '🗺️', description: 'Completed all steps in your learning roadmap.' },

    // Skill Achievements
    { id: 'SKILL_COLLECTOR', name: 'Skill Collector', icon: '📚', description: 'Acquired 10 different skills.' },
    { id: 'EXPERT_DEVELOPER', name: 'Expert', icon: '🌟', description: 'Achieved "Expert" proficiency in a skill.' },
    { id: 'ADVANCED_PRACTITIONER', name: 'Advanced Practitioner', icon: '🧑‍🔬', description: 'Achieved "Advanced" proficiency in 5 skills.' },

    // Consistency Achievements
    { id: 'STREAK_KEEPER', name: '7-Day Streak', icon: '🔥', description: 'Maintained a 7-day streak.' },
];

export const checkAndAwardAchievements = (user: UserProfile): Achievement[] => {
    const existingIds = new Set(user.achievements.map(a => a.id));
    const potentialNewAchievements: Achievement[] = [];

    const addAchievement = (id: string) => {
        if (!existingIds.has(id)) {
            const achievement = ALL_ACHIEVEMENTS.find(a => a.id === id);
            if (achievement) {
                potentialNewAchievements.push(achievement);
            }
        }
    };

    // --- Check Project Achievements ---
    const completedProjects = user.projects.filter(p => p.status === 'Completed');
    if (user.projects.some(p => p.status !== 'Not Started')) {
        addAchievement('PROJECT_STARTER');
    }
    if (completedProjects.length >= 1) {
        addAchievement('PROJECT_FINISHER');
    }
    if (completedProjects.length >= 3) {
        addAchievement('TRIPLE_THREAT');
    }
    if (completedProjects.some(p => p.difficulty === 'Hard')) {
        addAchievement('HARD_MODE');
    }
    
    // --- Check Roadmap Achievements ---
    const completedSteps = user.roadmap.filter(r => r.completed);
    if (completedSteps.length >= 1) {
        addAchievement('FIRST_STEP');
    }
    if (user.roadmap.length > 0 && (completedSteps.length / user.roadmap.length) >= 0.5) {
        addAchievement('HALFWAY_THERE');
    }
    if (user.roadmap.length > 0 && user.roadmap.every(r => r.completed)) {
        addAchievement('ROADMAP_COMPLETE');
    }

    // --- Check Skill Achievements ---
    if (user.skills.length >= 10) {
        addAchievement('SKILL_COLLECTOR');
    }
    if (user.skills.some(s => s.proficiency === 'Expert')) {
        addAchievement('EXPERT_DEVELOPER');
    }
    if (user.skills.filter(s => s.proficiency === 'Advanced').length >= 5) {
        addAchievement('ADVANCED_PRACTITIONER');
    }

    // --- Check Consistency Achievements ---
    if (user.streak >= 7) {
        addAchievement('STREAK_KEEPER');
    }
    
    // Return a combined, unique list
    const finalAchievements = [...user.achievements];
    potentialNewAchievements.forEach(newAch => {
        if (!finalAchievements.some(existing => existing.id === newAch.id)) {
            finalAchievements.push(newAch);
        }
    });

    return finalAchievements;
};
