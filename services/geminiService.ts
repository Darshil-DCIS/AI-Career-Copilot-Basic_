import { GoogleGenAI, Type } from "@google/genai";
import type {
    SkillGap,
    RoadmapStep,
    ProjectSuggestion,
    ResumeFeedback,
    Trend,
    UserProfile,
    ChatMessage,
    ProjectStep,
    QuizQuestion,
    Course,
    JobPosting,
} from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Helper to safely parse JSON from the model, which might be in a markdown block
const parseJsonResponse = <T>(text: string, fallback: T): T => {
    try {
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
        const jsonString = jsonMatch ? jsonMatch[1] : text;
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse JSON response:", text, e);
        return fallback;
    }
};

export const generateSkillMap = async (interests: string, resume: string, targetRole: string, githubUrl: string, linkedinUrl: string): Promise<SkillGap[]> => {
    const prompt = `
        Analyze the following user profile to identify their current skills and skill gaps for a target role of "${targetRole}".

        **User Interests:** ${interests}
        **Resume/Experience:** ${resume}
        **GitHub Profile:** ${githubUrl || 'Not provided'}
        **LinkedIn Profile:** ${linkedinUrl || 'Not provided'}

        Based on this information:
        1.  Identify all relevant skills (technical and soft).
        2.  Categorize each skill (e.g., "Programming Languages", "Frameworks", "Cloud", "Soft Skills").
        3.  Estimate their proficiency level (Beginner, Intermediate, Advanced, Expert).
        4.  Determine if a skill is a "gap" (i.e., a skill they likely need for the target role but don't possess or have low proficiency in).
        5.  Return the analysis as a JSON array.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            proficiency: { type: Type.STRING, enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] },
                            category: { type: Type.ARRAY, items: { type: Type.STRING } },
                            isGap: { type: Type.BOOLEAN }
                        },
                        required: ['name', 'proficiency', 'category', 'isGap']
                    }
                }
            },
        });
        return parseJsonResponse(response.text, []);
    } catch (error) {
        console.error("Error generating skill map:", error);
        return [];
    }
};

export const generateRoadmap = async (skills: SkillGap[], targetRole: string, refinementPrompt?: string): Promise<RoadmapStep[]> => {
    const prompt = `
        Create a detailed, actionable learning roadmap for a user aiming to become a "${targetRole}".
        The user's current skills are:
        ${skills.map(s => `- ${s.name} (${s.proficiency}, ${s.isGap ? 'Gap' : 'Existing'})`).join('\n')}

        The roadmap should:
        1. Be broken down into logical steps or phases (e.g., "Week 1-2: Foundations").
        2. For each step, list the specific skills to learn.
        3. Suggest 3-4 high-quality, real resources (courses, articles, docs, videos) for each step with their type and a valid URL.
        4. Define a small, practical milestone project to complete at the end of each step to solidify learning.
        5. The entire roadmap should be achievable within a reasonable timeframe (e.g., 3-6 months).
        ${refinementPrompt ? `\n**User Refinement:** "${refinementPrompt}"\nIncorporate this feedback into the new roadmap.` : ''}

        Return this as a JSON array of roadmap steps. Set 'completed' to false for all steps.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
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
                        },
                        required: ['title', 'duration', 'skillsToLearn', 'suggestedResources', 'milestoneProject']
                    }
                },
            },
        });
        const steps = parseJsonResponse<Omit<RoadmapStep, 'completed'>[]>(response.text, []);
        return steps.map(step => ({ ...step, completed: false }));
    } catch (error) {
        console.error("Error generating roadmap:", error);
        return [];
    }
};

export const generateProjectSuggestions = async (skills: SkillGap[], refinementPrompt?: string): Promise<ProjectSuggestion[]> => {
     const prompt = `
        Based on the user's skills, suggest 3-5 portfolio-worthy projects.
        User's skills: ${skills.map(s => s.name).join(', ')}

        For each project:
        1. Provide a catchy title and a brief description.
        2. List the key skills required.
        3. Assign a difficulty (Easy, Medium, Hard).
        4. Assign an XP value (Easy: 50-100, Medium: 150-250, Hard: 300-500).
        ${refinementPrompt ? `\n**User Refinement:** "${refinementPrompt}"\nIncorporate this feedback into the new suggestions.` : ''}

        Return this as a JSON array.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
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
                }
            },
        });
        return parseJsonResponse(response.text, []);
    } catch (error) {
        console.error("Error generating project suggestions:", error);
        return [];
    }
};

export const getIndustryTrends = async (targetRole: string): Promise<Trend[]> => {
    const prompt = `
        Identify key industry trends for a "${targetRole}".
        Provide 2 "Current" trends (what's hot right now) and 2 "Future" trends (what's emerging).
        For each trend, provide a title and a concise 2-3 sentence summary.
        Return this as a JSON array.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            summary: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ['Current', 'Future'] }
                        },
                        required: ['title', 'summary', 'type']
                    }
                }
            },
        });
        return parseJsonResponse(response.text, []);
    } catch (error) {
        console.error("Error getting industry trends:", error);
        return [];
    }
};

export const getResumeFeedback = async (resumeText: string, targetRole: string): Promise<ResumeFeedback> => {
    const prompt = `
        Act as an expert career coach and resume reviewer. Analyze the following resume for a person targeting a "${targetRole}" position.

        **Resume Text:**
        ${resumeText}

        **Tasks:**
        1.  **Overall Score:** Provide an overall score out of 100.
        2.  **Section-by-Section Feedback:** Analyze key sections (e.g., Summary, Experience, Skills, Projects). For each, provide a score out of 10, specific feedback, and 2-3 actionable suggestions for improvement.
        3.  **Final Summary:** Write a concise summary of the resume's strengths and weaknesses.
        4.  **Suggested Bullets:** Generate 3-4 powerful, action-oriented bullet points tailored to the target role that the user could adapt for their experience section.

        Return the complete analysis in a single JSON object.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        overallScore: { type: Type.NUMBER },
                        feedbackSections: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    score: { type: Type.NUMBER },
                                    feedback: { type: Type.STRING },
                                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ['title', 'score', 'feedback', 'suggestions']
                            }
                        },
                        finalSummary: { type: Type.STRING },
                        suggestedBullets: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['overallScore', 'feedbackSections', 'finalSummary', 'suggestedBullets']
                }
            },
        });
        return parseJsonResponse(response.text, { overallScore: 0, feedbackSections: [], finalSummary: '', suggestedBullets: [] });
    } catch (error) {
        console.error("Error getting resume feedback:", error);
        throw error;
    }
};

export const buildResume = async (user: UserProfile, sections: { summary: boolean, skills: boolean, projects: boolean, experience: boolean }): Promise<string> => {
    const prompt = `
        Generate a professional resume in Markdown format for ${user.name}.
        Target Role: ${user.targetRole}
        
        Available Data:
        - Skills: ${user.skills.map(s => s.name).join(', ')}
        - Completed Projects: ${user.projects.filter(p => p.status === 'Completed').map(p => `- ${p.title}: ${p.description}`).join('\n')}
        - Contact: LinkedIn: ${user.linkedinUrl || 'N/A'}, GitHub: ${user.githubUrl || 'N/A'}

        Include the following sections based on the user's selection:
        ${sections.summary ? '- A professional summary (2-3 sentences).' : ''}
        ${sections.skills ? '- A skills section, categorized.' : ''}
        ${sections.projects ? '- A projects section, highlighting key achievements for 2-3 top projects.' : ''}
        ${sections.experience ? '- A professional experience section with placeholders for the user to fill in.' : ''}

        Format the output as clean, well-structured Markdown.
    `;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (error) {
        console.error("Error building resume:", error);
        return "Error: Could not generate resume.";
    }
};

export const summarizeInterview = async (transcript: ChatMessage[], targetRole: string): Promise<string> => {
    const prompt = `
        Analyze the following mock interview transcript for a "${targetRole}" role.
        Provide a concise summary of feedback for the candidate. Structure the feedback using Markdown with the following sections:
        - **Overall Performance:** A brief summary.
        - **Strengths:** 2-3 bullet points on what they did well.
        - **Areas for Improvement:** 2-3 bullet points with actionable advice.

        **Transcript:**
        ${transcript.map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.text}`).join('\n')}
    `;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (error) {
        console.error("Error summarizing interview:", error);
        return "Could not generate a summary.";
    }
};

export const getQuizTopics = async (targetRole: string): Promise<string[]> => {
    const prompt = `List 5-7 key technical or domain-specific topics that are essential for a "${targetRole}" interview. Return as a JSON array of strings.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } },
        });
        return parseJsonResponse(response.text, []);
    } catch (error) {
        console.error("Error getting quiz topics:", error);
        return [];
    }
};

export const generateQuizQuestion = async (topics: string[], askedQuestions: string[]): Promise<QuizQuestion | null> => {
    const prompt = `
        Generate a multiple-choice quiz question for an interview candidate based on these topics: ${topics.join(', ')}.
        The question should be relevant for a job interview.
        Do not repeat any of these previously asked questions: ${askedQuestions.join(', ') || 'None'}

        Provide:
        - A clear question.
        - 4 distinct options.
        - The correct answer.
        - A brief explanation for the answer.

        Return as a single JSON object.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ['mcq'] },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        answer: { type: Type.STRING },
                        explanation: { type: Type.STRING }
                    },
                    required: ['question', 'type', 'options', 'answer', 'explanation']
                }
            },
        });
        return parseJsonResponse(response.text, null);
    } catch (error) {
        console.error("Error generating quiz question:", error);
        return null;
    }
};

export const summarizeVoiceSession = async (transcript: { speaker: string, text: string }[], userName: string, targetRole: string): Promise<string> => {
    const prompt = `
        Analyze the following voice session transcript between an AI Mentor and a user named ${userName}, who is preparing for a "${targetRole}" role.
        Identify the key takeaways and advice given during the session.
        Summarize these points into 3-4 bullet points using Markdown.

        **Transcript:**
        ${transcript.map(t => `${t.speaker === 'user' ? userName : 'Mentor'}: ${t.text}`).join('\n')}
    `;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (error) {
        console.error("Error summarizing voice session:", error);
        return "Could not generate a summary.";
    }
};

export const findNearbyCourses = async (query: string, location: { latitude: number, longitude: number }): Promise<Course[]> => {
    const prompt = `
        Find local, in-person courses, workshops, or bootcamps related to "${query}".
        For each result, provide the course title, a short description, and a Google Maps URL.
        Format the output as a JSON array of objects.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleMaps: {} }],
                toolConfig: { retrievalConfig: { latLng: location } }
            },
        });
        
        const courses: Course[] = [];
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        for (const chunk of chunks) {
            if (chunk.maps) {
                courses.push({
                    title: chunk.maps.title || query,
                    description: `A local opportunity for ${query} found near you.`,
                    url: chunk.maps.uri,
                    type: 'Local'
                });
            }
        }
        // Supplement with text if available and looks like JSON
        if (response.text.trim().startsWith('[')) {
             const textCourses = parseJsonResponse<any[]>(response.text, []);
             textCourses.forEach(tc => {
                 if(tc.title && tc.url && !courses.some(c => c.url === tc.url)) {
                     courses.push({
                         title: tc.title,
                         description: tc.description || '',
                         url: tc.url,
                         type: 'Local'
                     });
                 }
             });
        }

        return courses;
    } catch (error) {
        console.error("Error finding nearby courses:", error);
        return [];
    }
};

export const findOnlineCourses = async (query: string): Promise<Course[]> => {
     const prompt = `
        Find the top 5 online courses for "${query}".
        For each course, provide the title, a short description, the URL, and a rating out of 5.
        Format the output as a JSON array of objects.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] },
        });
        // The model is asked to return JSON, but grounding is used, so we parse defensively.
        return parseJsonResponse(response.text, []);
    } catch (error) {
        console.error("Error finding online courses:", error);
        return [];
    }
};

export const generateProjectPlan = async (title: string, description: string): Promise<ProjectStep[]> => {
    const prompt = `
        Create a step-by-step project plan for the following project:
        **Title:** ${title}
        **Description:** ${description}

        Break it down into 5-7 actionable steps. For each step, provide a title and a 1-2 sentence description.
        Return this as a JSON array. Set 'completed' to false for all steps.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                        },
                        required: ['title', 'description']
                    }
                }
            },
        });
        const plan = parseJsonResponse<Omit<ProjectStep, 'completed'>[]>(response.text, []);
        return plan.map(p => ({ ...p, completed: false }));
    } catch (error) {
        console.error("Error generating project plan:", error);
        return [];
    }
};

export const findJobs = async (role: string, location: string): Promise<JobPosting[]> => {
    const prompt = `
        Find 5 recent job postings for a "${role}" role ${location ? `in or near "${location}"` : ''}.
        For each job, provide the title, company, location, a direct URL to the posting, and a brief description.
        Format the output as a JSON array.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] },
        });
        return parseJsonResponse(response.text, []);
    } catch (error) {
        console.error("Error finding jobs:", error);
        return [];
    }
};

export const generateProfessionalEmail = async (recipientRole: string, goal: string, keyPoints: string): Promise<string> => {
    const prompt = `
        Draft a professional and concise email.
        - Recipient: ${recipientRole}
        - Goal of email: ${goal}
        - Key points to include:
        ${keyPoints.split('\n').map(p => `- ${p}`).join('\n')}

        The email should be well-structured with a clear subject line, a polite opening, a body that covers the key points, and a professional closing.
    `;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text;
};

export const generateElevatorPitch = async (user: UserProfile): Promise<string> => {
    const prompt = `
        Craft a compelling 30-second elevator pitch for ${user.name}.
        - Target Role: ${user.targetRole}
        - Key Skills: ${user.skills.filter(s => !s.isGap).map(s => s.name).slice(0, 5).join(', ')}
        - Highlight from Projects: Focus on a completed project if available: ${user.projects.find(p => p.status === 'Completed')?.title || 'General passion for the field'}.

        The pitch should be engaging, confident, and clearly state their value proposition for their target role.
    `;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text;
};

export const generateCoverLetter = async (jobDescription: string, userInfo: string, user: UserProfile): Promise<string> => {
    const prompt = `
        Write a professional cover letter for ${user.name} applying for a job.

        **User's Information:**
        ${userInfo}

        **Job Description:**
        ${jobDescription}

        The cover letter should:
        1. Be tailored to the specific job description.
        2. Highlight the most relevant skills and project experiences from the user's info.
        3. Have a professional tone and structure (introduction, body paragraphs connecting experience to job requirements, conclusion).
        4. Express genuine interest in the role and company.
    `;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
    return response.text;
};

export const optimizeLinkedInSummary = async (currentSummary: string, user: UserProfile): Promise<string> => {
    const prompt = `
        Act as a LinkedIn profile optimization expert. Review and improve this LinkedIn summary for ${user.name}, who is targeting a "${user.targetRole}" role.

        **Current Summary (if any):**
        ${currentSummary || "None provided. Please create a new one from scratch."}

        **User's Profile Data:**
        - Key Skills: ${user.skills.filter(s => s.proficiency !== 'Beginner').map(s => s.name).join(', ')}
        - Completed Projects: ${user.projects.filter(p => p.status === 'Completed').map(p => p.title).join(', ')}

        The optimized summary should be:
        - Written in the first person.
        - Start with a strong hook that clearly states their professional identity and value.
        - Showcase their top 3-5 skills and expertise areas.
        - Mention a key achievement or project experience.
        - End with a call to action (e.g., "I'm passionate about [topic] and open to connecting...").
        - Be keyword-rich for the target role.
    `;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text;
};