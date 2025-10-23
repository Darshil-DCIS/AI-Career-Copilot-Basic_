
import { GoogleGenAI, Type } from "@google/genai";
import type { Skill, RoadmapStep, ProjectSuggestion, ResumeFeedback, SkillGap, FutureTrend, Course } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const generationConfig = {
    temperature: 0.2,
    topP: 0.9,
    topK: 40,
};

export const generateSkillMap = async (interests: string, resumeText: string, targetRole: string, githubUrl?: string, linkedinUrl?: string): Promise<SkillGap[]> => {
    const prompt = `
        Based on the following user information, generate a skill map for the target role of "${targetRole}".
        User Interests: ${interests}
        User Resume/Experience: ${resumeText}
        User GitHub: ${githubUrl || 'Not provided'}
        User LinkedIn: ${linkedinUrl || 'Not provided'}
        
        Identify key skills required for a ${targetRole}. 
        Then, assess the user's current proficiency in each skill based on their provided information (resume is the primary source).
        Finally, identify which of these required skills are gaps for the user.
        A skill is a "gap" if it's required for the role but not mentioned or demonstrated in the user's experience.
    `;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                proficiency: { type: Type.STRING, enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] },
                category: { type: Type.STRING, enum: ['Programming Language', 'Framework/Library', 'Tool', 'Soft Skill', 'Concept'] },
                isGap: { type: Type.BOOLEAN }
            },
            required: ['name', 'proficiency', 'category', 'isGap']
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                ...generationConfig,
                responseMimeType: 'application/json',
                responseSchema
            }
        });
        const parsed = JSON.parse(response.text);
        return parsed as SkillGap[];
    } catch (error) {
        console.error("Error generating skill map:", error);
        return [];
    }
};

export const generateRoadmap = async (skills: SkillGap[], targetRole: string): Promise<RoadmapStep[]> => {
    const skillGaps = skills.filter(s => s.isGap).map(s => s.name);
    const existingSkills = skills.filter(s => !s.isGap).map(s => `${s.name} (${s.proficiency})`);

    const prompt = `
        Create a personalized 3-month learning roadmap for a user aiming to become a "${targetRole}".
        
        User's Existing Skills: ${existingSkills.join(', ')}
        Identified Skill Gaps to learn: ${skillGaps.join(', ')}
        
        The roadmap should be broken down into actionable steps with durations (e.g., "Weeks 1-2"). Each step must include:
        1. A clear title for the learning phase.
        2. A list of specific skills to learn from the identified gaps.
        3. A list of 2-3 suggested learning resources (Courses, Articles, Videos, Docs) with placeholder URLs (e.g., "https://example.com/course").
        4. A small, practical milestone project to apply the learned skills.
        
        Generate a roadmap with about 4-6 steps.
    `;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                duration: { type: Type.STRING },
                skillsToLearn: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestedResources: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            url: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ['Course', 'Article', 'Video', 'Documentation'] }
                        },
                        required: ['name', 'url', 'type']
                    }
                },
                milestoneProject: { type: Type.STRING },
                completed: { type: Type.BOOLEAN, default: false }
            },
            required: ['title', 'duration', 'skillsToLearn', 'suggestedResources', 'milestoneProject']
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                ...generationConfig,
                temperature: 0.5,
                responseMimeType: 'application/json',
                responseSchema,
            }
        });
        const parsed = JSON.parse(response.text);
        return parsed.map((step: any) => ({ ...step, completed: false })) as RoadmapStep[];
    } catch (error) {
        console.error("Error generating roadmap:", error);
        return [];
    }
};

export const generateProjectSuggestions = async (skills: Skill[]): Promise<ProjectSuggestion[]> => {
    const skillList = skills.map(s => `${s.name} (${s.proficiency})`).join(', ');
    const prompt = `
        Based on the user's current skills: ${skillList}, suggest 3 mini-projects they can build to practice and showcase their abilities.
        For each project, provide a title, a short description, a list of required skills, a difficulty level (Easy, Medium, Hard), and assign XP points (e.g., 100 for Easy, 250 for Medium, 500 for Hard).
    `;
    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
                xp: { type: Type.INTEGER }
            },
            required: ['title', 'description', 'requiredSkills', 'difficulty', 'xp']
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                ...generationConfig,
                responseMimeType: 'application/json',
                responseSchema,
            }
        });
        return JSON.parse(response.text) as ProjectSuggestion[];
    } catch (error) {
        console.error("Error generating project suggestions:", error);
        return [];
    }
};

export const getFutureSkillTrends = async (targetRole: string): Promise<FutureTrend[]> => {
    const prompt = `
        Based on the target role of "${targetRole}", identify 3-4 emerging skills or technologies that will be important in the next 2-3 years for this field.
        For each skill, provide a short reason why it's becoming important.
    `;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                skill: { type: Type.STRING },
                reason: { type: Type.STRING },
            },
            required: ['skill', 'reason']
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                ...generationConfig,
                responseMimeType: 'application/json',
                responseSchema,
            }
        });
        return JSON.parse(response.text) as FutureTrend[];
    } catch (error) {
        console.error("Error generating future trends:", error);
        return [];
    }
}

export const getResumeFeedback = async (resumeText: string, targetRole: string): Promise<ResumeFeedback | null> => {
    const prompt = `
      Analyze the following resume for a user targeting the role of "${targetRole}".
      Provide a detailed, structured critique in JSON format.
      The analysis should cover these sections: Formatting & Readability, Keyword Optimization for ${targetRole}, Impact & Action Verbs, and Grammar & Spelling.
      For each section, provide a score out of 10, specific feedback, and actionable suggestions.
      Also include an overall score out of 100 and a final summary.
      Finally, generate 3-5 tailored resume bullet points that the user could adapt. These bullet points should be results-oriented and relevant to the ${targetRole}.
      
      Resume Text:
      ---
      ${resumeText}
      ---
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            overallScore: { type: Type.INTEGER },
            feedbackSections: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        score: { type: Type.INTEGER },
                        feedback: { type: Type.STRING },
                        suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['title', 'score', 'feedback', 'suggestions']
                }
            },
            finalSummary: { type: Type.STRING },
            suggestedBullets: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Results-oriented bullet points for the target role."
            }
        },
        required: ['overallScore', 'feedbackSections', 'finalSummary', 'suggestedBullets']
    };
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                ...generationConfig,
                responseMimeType: 'application/json',
                responseSchema,
            }
        });
        return JSON.parse(response.text) as ResumeFeedback;
    } catch (error) {
        console.error("Error getting resume feedback:", error);
        return null;
    }
};


export const findNearbyCourses = async (query: string, location: { latitude: number, longitude: number }): Promise<Course[]> => {
    const prompt = `Find nearby courses, workshops, or bootcamps related to "${query}". Provide a title, a short description, and the Google Maps URL for each.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleMaps: {} }],
                toolConfig: {
                    retrievalConfig: {
                        latLng: {
                            latitude: location.latitude,
                            longitude: location.longitude,
                        }
                    }
                }
            },
        });

        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (!chunks) {
            // If no grounded results, maybe the text itself has the info.
            // This is a simple fallback. A more robust solution might parse the text.
            return [{ title: "Could not find specific places", description: response.text, url: "https://maps.google.com" }];
        }

        const courses: Course[] = chunks.map((chunk: any) => ({
            title: chunk.maps.title || 'Untitled Course',
            description: `A learning opportunity found on Google Maps related to your search.`,
            url: chunk.maps.uri || 'https://maps.google.com'
        }));

        return courses;

    } catch (error) {
        console.error("Error finding nearby courses:", error);
        return [];
    }
}
