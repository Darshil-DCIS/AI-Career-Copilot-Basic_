import { GoogleGenAI, Type } from "@google/genai";
import type { Skill, RoadmapStep, ProjectSuggestion, ResumeFeedback, SkillGap, Trend, Course, ChatMessage, VoiceSession, ProjectStep, JobPosting, UserProfile } from '../types';

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
        User's professional interests: ${interests}
        User's resume/experience summary: ${resumeText}
        User's GitHub: ${githubUrl || 'Not provided'}
        User's LinkedIn: ${linkedinUrl || 'Not provided'}
        
        1. Identify key skills required for a ${targetRole}. These can be technical, soft, or domain-specific skills.
        2. Generate relevant, high-level categories for these skills based on the role. For example, a "Marketing Manager" might have categories like "Digital Marketing", "Analytics", "Content Strategy", "Leadership". A "Software Engineer" might have "Programming Languages", "Frameworks", "Databases", "DevOps".
        3. Assess the user's current proficiency in each skill based on their provided information (resume is the primary source).
        4. Identify which of these required skills are gaps. A skill is a "gap" if it's essential for the role but not clearly demonstrated in the user's experience.
    `;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                proficiency: { type: Type.STRING, enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] },
                category: { type: Type.STRING, description: "A relevant, high-level category for the skill, tailored to the target role." },
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

export const generateRoadmap = async (skills: SkillGap[], targetRole: string, refinementPrompt?: string): Promise<RoadmapStep[]> => {
    const skillGaps = (skills || []).filter(s => s.isGap).map(s => s.name);
    const existingSkills = (skills || []).filter(s => !s.isGap).map(s => `${s.name} (${s.proficiency})`);

    const prompt = `
        Create a personalized 3-month learning roadmap for a user aiming to become a "${targetRole}".
        
        User's Existing Skills: ${existingSkills.join(', ') || 'None specified'}
        Identified Skill Gaps to learn: ${skillGaps.join(', ')}
        ${refinementPrompt ? `User's refinement request: "${refinementPrompt}"\nAdapt the roadmap based on this request.` : ''}
        
        The roadmap should be broken down into actionable steps with durations (e.g., "Month 1: Weeks 1-2"). Each step must include:
        1. A clear title for the learning phase.
        2. A list of specific skills to learn from the identified gaps.
        3. A list of 2-3 suggested learning resources (Courses, Articles, Videos, Books, Podcasts etc.) with real, searchable names but placeholder URLs (e.g., "https://example.com/course").
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
                            type: { type: Type.STRING, enum: ['Course', 'Article', 'Video', 'Documentation', 'Book', 'Podcast'] }
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

export const generateProjectSuggestions = async (skills: Skill[], refinementPrompt?: string): Promise<ProjectSuggestion[]> => {
    const skillList = (skills || []).map(s => `${s.name} (${s.proficiency})`).join(', ');
    const prompt = `
        Based on the user's current skills: ${skillList}, suggest 3 portfolio-worthy projects they can build to practice and showcase their abilities.
        ${refinementPrompt ? `User's refinement request: "${refinementPrompt}"\nAdapt the project suggestions based on this request.` : ''}
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


export const generateProjectPlan = async (projectTitle: string, projectDescription: string): Promise<ProjectStep[]> => {
    const prompt = `
        Create a detailed, step-by-step plan for completing the following project. Break it down into 5-7 actionable steps. For each step, provide a clear title and a brief description of what needs to be done.
        
        Project Title: ${projectTitle}
        Project Description: ${projectDescription}
    `;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING }
            },
            required: ['title', 'description']
        }
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
        const parsed = JSON.parse(response.text);
        return parsed.map((step: any) => ({...step, completed: false})) as ProjectStep[];
    } catch (error) {
        console.error("Error generating project plan:", error);
        return [];
    }
};


export const getIndustryTrends = async (targetRole: string): Promise<Trend[]> => {
    const prompt = `
        Act as an industry analyst for the "${targetRole}" profession. Use Google Search to find two types of information:
        1.  **Current Buzz**: Identify 3-4 recent (last 6 months) and significant developments. This could include major news, important discoveries, influential new tools, or impactful project launches.
        2.  **Future Forecast**: Identify 3-4 emerging trends that will be important in the next 1-3 years. This could include new skills, shifting methodologies, or upcoming technologies.

        For each item, provide a clear title and a concise summary explaining its relevance. Classify each item with the 'type' as either 'Current' or 'Future'.
        IMPORTANT: Your response MUST be only a valid JSON array of objects, without any markdown formatting or other text.
    `;
    
    // FIX: Removed responseSchema definition and usage below as it is not supported with the googleSearch tool.
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        });

        const text = response.text.trim().replace(/^```json\n?/, '').replace(/```$/, '');
        return JSON.parse(text) as Trend[];

    } catch (error) {
        console.error("Error generating industry trends:", error);
        // Fallback for parsing error
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt + "\n\nOriginal response failed parsing. Please ensure your output is a valid JSON array.",
                config: {
                    tools: [{googleSearch: {}}],
                }
            });
            const text = response.text.trim().replace(/^```json\n?/, '').replace(/```$/, '');
            return JSON.parse(text) as Trend[];
        } catch (fallbackError) {
             console.error("Fallback for industry trends also failed:", fallbackError);
            return [];
        }
    }
}

export const buildResume = async (
    user: UserProfile, 
    includedSections: { summary: boolean; skills: boolean; projects: boolean; experience: boolean; }
): Promise<string> => {
    const { name, targetRole, skills, projects, linkedinUrl, githubUrl } = user;
    const completedProjects = (projects || []).filter(p => p.status === 'Completed');

    const sections = [
        { key: 'summary', title: 'Summary', prompt: 'A compelling 2-3 sentence professional summary tailored to the target role, highlighting key skills and ambitions.' },
        { key: 'skills', title: 'Skills', prompt: 'A categorized list of skills. Group them logically based on their category (e.g., Programming Languages, Frameworks, Tools, Soft Skills).' },
        { key: 'projects', title: 'Projects', prompt: 'A section for "Portfolio Projects". For each project, list the title, a concise one-sentence description focusing on the achievement, and the technologies/skills used.' },
        { key: 'experience', title: 'Experience/Education', prompt: 'Create placeholder sections for "Professional Experience" and "Education" with instructions for the user to fill them in (e.g., "[Your Job Title], [Company Name], [Dates]").' },
    ];

    const requestedSections = sections.filter(s => includedSections[s.key as keyof typeof includedSections]);

    let structurePrompt = 'Structure the resume with the following sections in this order:\n1.  **Header**: Name, Target Role, and contact links.\n';
    requestedSections.forEach((section, index) => {
        structurePrompt += `${index + 2}.  **${section.title}**: ${section.prompt}\n`;
    });

    const prompt = `
        Act as a professional resume writer. Create a professional, one-page resume in MARKDOWN format for ${name}, who is targeting the role of "${targetRole}".
        
        Use the following information where applicable for the requested sections:
        - **Name**: ${name}
        - **Target Role**: ${targetRole}
        - **Contact Links**: LinkedIn: ${linkedinUrl || 'N/A'}, GitHub/Portfolio: ${githubUrl || 'N/A'}
        - **Skills**: 
          ${(skills || []).map(s => `- ${s.name} (${s.proficiency}, Category: ${s.category})`).join('\n')}
        - **Completed Projects**:
          ${completedProjects.length > 0 ? completedProjects.map(p => `
            - **Title**: ${p.title}
            - **Description**: ${p.description}
            - **Skills Used**: ${p.requiredSkills.join(', ')}
          `).join('\n') : 'No completed projects to display.'}

        ${structurePrompt}
        The final output should be a single block of well-formatted Markdown. Only include the requested sections after the header.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error building resume:", error);
        return "Error: Could not generate resume. Please try again.";
    }
};


export const getResumeFeedback = async (resumeText: string, targetRole: string): Promise<ResumeFeedback | null> => {
    const prompt = `
      Critically analyze the following resume for a candidate targeting the role of "${targetRole}". Your feedback must be highly detailed, constructive, and actionable.
      
      Resume Text:
      ---
      ${resumeText}
      ---

      Provide your analysis in a structured JSON format.
      1.  **Overall Score**: An integer score out of 100.
      2.  **Feedback Sections**: An array covering these specific areas:
          *   **First Impression & Formatting**: Readability, layout, consistency, length. Is it professional and easy to scan?
          *   **Impact & Quantification**: Does the candidate use strong action verbs? Are their achievements quantified with metrics (e.g., percentages, dollar amounts, time saved)?
          *   **Keyword & ATS Optimization**: Is the resume optimized with relevant keywords for a "${targetRole}"? How well will it pass through an Applicant Tracking System (ATS)?
          *   **Professional Summary/Objective**: Is it compelling, concise, and tailored to the target role?
          For each section, provide a score (out of 10), specific, honest feedback, and a list of actionable suggestions for improvement.
      3.  **Final Summary**: A concise paragraph summarizing the resume's key strengths and primary areas for improvement.
      4.  **Suggested Bullets**: Generate 3-5 exemplary, results-oriented resume bullet points that the user could adapt. These should be highly relevant to the "${targetRole}" role and demonstrate the "STAR" (Situation, Task, Action, Result) method.
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
                description: "Results-oriented bullet points for the target role using the STAR method."
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
    const prompt = `Find nearby in-person courses, workshops, or bootcamps related to "${query}". For each result, provide a title, a short description, and its Google Maps URL.`;

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
            if(response.text.trim()) {
                return [{ title: "AI Suggestion", description: response.text, url: `https://maps.google.com/?q=${encodeURIComponent(query)}`, type: 'Local' }];
            }
            return [];
        }

        const courses: Course[] = chunks.map((chunk: any) => ({
            title: chunk.maps.title || 'Untitled Course',
            description: `A learning opportunity found on Google Maps related to your search.`,
            url: chunk.maps.uri || `https://maps.google.com/?q=${encodeURIComponent(chunk.maps.title)}`,
            type: 'Local'
        }));

        return courses;

    } catch (error) {
        console.error("Error finding nearby courses:", error);
        return [];
    }
};

export const findOnlineCourses = async (query: string): Promise<Course[]> => {
    const prompt = `Search the web to find 5 popular and highly-rated online courses for the topic "${query}". For each course, provide its title, a one-sentence description, the direct URL to the course page, and a rating out of 5. IMPORTANT: Your response MUST be only a valid JSON array of objects, without any markdown formatting or other text.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        });

        const text = response.text.trim().replace(/^```json\n?/, '').replace(/```$/, '');
        const parsed = JSON.parse(text);
        return parsed.map((course: any) => ({...course, type: 'Online'})) as Course[];

    } catch (error) {
        console.error("Error finding online courses:", error);
        return [];
    }
};

export const summarizeInterview = async (transcript: ChatMessage[], targetRole: string): Promise<string> => {
    const formattedTranscript = transcript.map(msg => `${msg.role === 'user' ? 'Candidate' : 'Interviewer'}: ${msg.text}`).join('\n');
    
    const prompt = `
        You are an expert career coach reviewing a mock interview transcript for a "${targetRole}" position.
        Analyze the candidate's answers and provide a concise yet comprehensive summary of their performance as Markdown text.
        Structure your feedback clearly:
        1.  **Overall Impression**: A brief summary of how the candidate came across.
        2.  **Key Strengths**: 2-3 specific positive points. What did they do well? (e.g., "Excellent use of the STAR method on the project management question," "Demonstrated deep technical knowledge of X.").
        3.  **Areas for Improvement**: 2-3 specific, actionable suggestions. What could be better? (e.g., "Answers could be more concise," "Provide more specific metrics when describing achievements," "Seemed unsure when asked about Y.").
        4.  **Actionable Next Steps**: Suggest one concrete action they can take to prepare for the next interview.

        Transcript:
        ---
        ${formattedTranscript}
        ---
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error summarizing interview:", error);
        return "Could not generate a summary for this interview session.";
    }
};

export const summarizeVoiceSession = async (transcript: VoiceSession['transcript'], userName: string, targetRole: string): Promise<string> => {
    const formattedTranscript = transcript.map(msg => `${msg.speaker === 'user' ? userName : 'AI Mentor'}: ${msg.text}`).join('\n');

    const prompt = `
        You are an AI assistant reviewing a transcript of a voice mentoring session between a user and an AI Career Mentor.
        The user, ${userName}, is working towards a career as a "${targetRole}".
        Analyze the conversation and provide a summary of key takeaways for the user as Markdown text.
        Focus on:
        1.  **Main Topics Discussed**: What were the core questions or subjects the user brought up?
        2.  **Key Advice Given**: What was the most important advice provided by the mentor?
        3.  **Actionable Next Steps**: What are 1-2 concrete things the user should do based on this conversation?

        Transcript:
        ---
        ${formattedTranscript}
        ---
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error summarizing voice session:", error);
        return "Could not generate a summary for this voice session.";
    }
};

export const findJobs = async (targetRole: string, location: string): Promise<JobPosting[]> => {
    const prompt = `
        Find 5 recent job postings for a "${targetRole}" ${location ? `in or near "${location}"` : ''}.
        Use Google Search to find relevant listings on popular job boards (like LinkedIn, Indeed, Glassdoor, etc.).
        For each job, extract the following information: job title, company name, location, a direct URL to the posting, and a brief 1-2 sentence description of the role.
        IMPORTANT: Your response MUST be only a valid JSON array of objects, without any markdown formatting or other text.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });
        const text = response.text.trim().replace(/^```json\n?/, '').replace(/```$/, '');
        return JSON.parse(text) as JobPosting[];
    } catch (error) {
        console.error("Error finding jobs:", error);
        return [];
    }
};