import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import type { UserProfile, ChatMessage } from '../types';
import { SparklesIcon, SendIcon, BrainIcon, LinkedInIcon } from './icons';

interface SmartChatProps {
    user: UserProfile;
}

type ChatMode = 'mentor' | 'quick' | 'deep' | 'web' | 'networking';

const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error("API_KEY environment variable not set");
// FIX: Correctly instantiate GoogleGenAI with a named apiKey parameter as per the guidelines.
const ai = new GoogleGenAI({ apiKey: API_KEY });

const SmartChat: React.FC<SmartChatProps> = ({ user }) => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chatMode, setChatMode] = useState<ChatMode>('mentor');
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const initChat = () => {
             if (chatMode === 'web') {
                setChat(null); // Grounded queries don't use the Chat object
                setMessages([{ role: 'model', text: `I'm ready to search the web for you! What current topics or trends can I look up? 🌐` }]);
                return;
            }
            
            let systemInstruction = '';
            let welcomeMessage = `Hey ${user.name}! I'm your AI Career Copilot. How can I help you today? ✨`;

            switch(chatMode) {
                case 'networking':
                    systemInstruction = `You are a networking assistant for ${user.name}, whose LinkedIn is ${user.linkedinUrl || 'not provided'}. Your goal is to help them craft professional outreach messages for LinkedIn, find key people or companies in the ${user.targetRole} field, and offer strategies for building professional connections. Be concise and actionable.`;
                    welcomeMessage = `Let's work on your professional network! I can help you draft a LinkedIn message or find people to connect with in the ${user.targetRole} field. What's our goal today?`;
                    break;
                case 'mentor':
                case 'quick':
                case 'deep':
                default:
                    const completedSteps = (user.roadmap || []).filter(r => r.completed).map(r => r.title);
                    const incompleteSteps = (user.roadmap || []).filter(r => !r.completed).map(r => r.title);
                    const skillGaps = (user.skills || []).filter(s => s.isGap).map(s => s.name);

                    systemInstruction = `You are an expert AI Career Mentor for ${user.name}. Your persona is that of a knowledgeable, encouraging, and proactive career partner. Your tone is friendly, motivating, and professional, using emojis to be engaging.

**Your Core Mission:** Actively guide ${user.name} towards their goal of becoming a "${user.targetRole}". Do not just wait for questions. Be proactive.

**User Profile Context:**
*   **Target Role:** ${user.targetRole}
*   **Existing Skills:** ${(user.skills || []).map(s => `${s.name} (${s.proficiency})`).join(', ')}.
*   **Identified Skill Gaps:** ${skillGaps.join(', ') || 'None identified yet.'}
*   **Roadmap Progress:**
    *   **Completed:** ${completedSteps.join(', ') || 'No steps completed yet.'}
    *   **Next Steps:** ${incompleteSteps.join(', ') || 'No roadmap defined yet.'}

**Your Proactive Responsibilities:**
1.  **Suggest Next Steps:** Based on their completed roadmap items and remaining skill gaps, proactively suggest what they could focus on next. For example: "I see you've finished the 'Data Fundamentals' milestone! That's awesome 🎉. A great next step would be to tackle a project using Python's Pandas library to solidify those skills. Want some project ideas?"
2.  **Offer Resources:** When they mention a skill or a topic from their roadmap, offer to find relevant articles, tutorials, or courses.
3.  **Connect to Goals:** Always tie your advice back to their goal of becoming a ${user.targetRole}. Explain *why* a skill or project is important for that career path.
4.  **Check In:** If the chat is idle, you can initiate with a check-in, like "Hey ${user.name}, how's the progress on the '${incompleteSteps[0] || 'next'}' part of your roadmap going? Anything I can help with?"

Keep your answers concise but impactful. Your goal is to be a true copilot on their career journey. Let's go! 🚀`;
                    break;
            }


            // FIX: Updated deprecated model names to recommended versions.
            const modelForMode = chatMode === 'quick' ? 'gemini-flash-lite-latest' : 'gemini-2.5-pro';
            const config: { systemInstruction: string, thinkingConfig?: any } = { systemInstruction };
            if (chatMode === 'deep') {
                config.thinkingConfig = { thinkingBudget: 32768 };
            }

            const newChat = ai.chats.create({ model: modelForMode, config });
            setChat(newChat);
            setMessages([{ role: 'model', text: welcomeMessage }]);
        };
        initChat();
    }, [user, chatMode]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleWebSearch = async (prompt: string) => {
        setIsLoading(true);
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                }
            });

            const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
                title: chunk.web.title || new URL(chunk.web.uri).hostname,
                url: chunk.web.uri
            })) || [];

            setMessages(prev => [...prev, { role: 'model', text: response.text, sources }]);

        } catch (error) {
             console.error("Error with web search:", error);
             setMessages(prev => [...prev, { role: 'model', text: "Sorry, I couldn't search the web right now. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
       
        if (chatMode === 'web') {
            await handleWebSearch(currentInput);
            return;
        }
        
        setIsLoading(true);
        try {
            if (chat) { 
                const responseStream = await chat.sendMessageStream({ message: currentInput });
                let modelResponseText = '';
                setMessages(prev => [...prev, { role: 'model', text: '' }]); 

                for await (const chunk of responseStream) {
                    modelResponseText += chunk.text;
                    setMessages(prev => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1].text = modelResponseText;
                        return newMessages;
                    });
                }
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setMessages(prev => [...prev, { role: 'model', text: "Oops! Something went wrong. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto p-4 fade-in">
             <header className="text-center mb-4 shrink-0">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
                    <SparklesIcon className="text-teal-400 w-8 h-8" />
                    Smart Chat
                </h1>
                <p className="text-slate-400 mt-1">Your personal guide for career questions.</p>
            </header>
            
            <div className="flex justify-center items-center gap-2 mb-4 p-1 bg-slate-800/70 border border-slate-700 rounded-lg shrink-0">
                <ChatModeButton mode="mentor" current={chatMode} setMode={setChatMode} label="Mentor" />
                <ChatModeButton mode="web" current={chatMode} setMode={setChatMode} label="Web Search" />
                <ChatModeButton mode="networking" current={chatMode} setMode={setChatMode} label="Networking" Icon={LinkedInIcon}/>
                <ChatModeButton mode="deep" current={chatMode} setMode={setChatMode} label="Deep Dive" Icon={BrainIcon}/>
            </div>

            <div ref={chatContainerRef} className="flex-grow overflow-y-auto bg-slate-900/30 rounded-lg p-4 space-y-6">
                {messages.map((msg, index) => (
                    <div key={index}>
                        <div className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'model' && <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 flex-shrink-0 flex items-center justify-center shadow-lg"><SparklesIcon className="w-5 h-5"/></div>}
                            <div className={`max-w-xl px-5 py-3 rounded-2xl shadow-md ${msg.role === 'user' ? 'bg-cyan-600 rounded-br-none' : 'bg-slate-700/80 rounded-bl-none'}`}>
                                <p className="text-white whitespace-pre-wrap leading-relaxed">{msg.text}{isLoading && msg.role === 'model' && index === messages.length - 1 ? '...' : ''}</p>
                            </div>
                        </div>
                        {msg.sources && msg.sources.length > 0 && (
                            <div className="max-w-xl ml-12 mt-2">
                                <h4 className="text-xs font-semibold text-slate-400 mb-1">Sources:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {msg.sources.map(source => (
                                        <a href={source.url} target="_blank" rel="noopener noreferrer" key={source.url} className="text-xs bg-slate-600/50 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded-md transition-colors truncate">
                                            {source.title}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                 {isLoading && (chatMode === 'deep' || chatMode === 'web') && (
                    <div className="flex justify-center items-center gap-2 text-sm text-teal-300">
                        {chatMode === 'deep' ? <BrainIcon className="w-5 h-5 animate-pulse" /> : <SparklesIcon className="w-5 h-5 animate-pulse" />}
                        {chatMode === 'deep' ? "Engaging deep thought..." : "Searching the web..."}
                    </div>
                 )}
            </div>
            <div className="mt-4 flex items-center gap-3 p-2 bg-slate-800/80 border border-slate-700 rounded-xl shrink-0">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about projects, interviews, or skills..."
                    className="w-full bg-transparent focus:outline-none p-2"
                    disabled={isLoading}
                />
                <button 
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="p-2.5 rounded-lg bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed hover:bg-cyan-700 transition-colors"
                >
                    <SendIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

const ChatModeButton: React.FC<{mode: ChatMode, current: ChatMode, setMode: (mode: ChatMode) => void, label: string, Icon?: React.FC<{className?: string}>}> = ({mode, current, setMode, label, Icon}) => (
    <button
        onClick={() => setMode(mode)}
        className={`flex-1 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${current === mode ? 'bg-cyan-600 text-white shadow-md' : 'bg-transparent text-slate-300 hover:bg-slate-700/50'}`}
    >
       {Icon && <Icon className="w-4 h-4" />}
       {label}
    </button>
);


export default SmartChat;