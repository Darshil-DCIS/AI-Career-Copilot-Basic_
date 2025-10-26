import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import type { UserProfile, ChatMessage, ChatSession } from '../types';
import { SparklesIcon, SendIcon, BrainIcon, LinkedInIcon, HistoryIcon } from './icons';

interface SmartChatProps {
    user: UserProfile;
    onSaveHistory: (session: ChatSession) => void;
}

type ChatMode = 'mentor' | 'quick' | 'deep' | 'web' | 'networking';
type ViewMode = 'chat' | 'history';

const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error("API_KEY environment variable not set");
const ai = new GoogleGenAI({ apiKey: API_KEY });

const TypingIndicator = () => (
    <div className="flex items-center gap-1.5 dot-bounce h-5">
        <div className="w-2.5 h-2.5 bg-slate-400 rounded-full dot1"></div>
        <div className="w-2.5 h-2.5 bg-slate-400 rounded-full dot2"></div>
        <div className="w-2.5 h-2.5 bg-slate-400 rounded-full"></div>
    </div>
);

const SmartChat: React.FC<SmartChatProps> = ({ user, onSaveHistory }) => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chatMode, setChatMode] = useState<ChatMode>('mentor');
    const [viewMode, setViewMode] = useState<ViewMode>('chat');
    const [selectedHistory, setSelectedHistory] = useState<ChatMessage[] | null>(null);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef(messages);
    
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        // Stash the current chat mode for use in the cleanup function
        const modeForThisSession = chatMode;
        
        const initChat = () => {
             if (chatMode === 'web') {
                setChat(null);
                setMessages([{ role: 'model', text: `I'm ready to search the web for you! What current topics or trends can I look up? 🌐` }]);
                return;
            }
            
            let systemInstruction = '';
            let welcomeMessage = `Hey ${user.name}! I'm your AI Career Copilot. How can I help you today? ✨`;

            switch(chatMode) {
                case 'networking':
                    systemInstruction = `You are a professional networking assistant for a user with the following profile. Your goal is to help them craft professional outreach messages, find key contacts, and offer strategies for building professional connections. Your advice should be tailored to their specific background and goals.

**User Profile:**
*   **Name:** ${user.name}
*   **Age:** ${user.age}
*   **Current Profession/Role:** ${user.profession}
*   **Education Level:** ${user.educationLevel}
*   **Target Role:** ${user.targetRole}
*   **Key Skills:** ${(user.skills || []).filter(s => !s.isGap).map(s => s.name).join(', ')}
*   **LinkedIn Profile:** ${user.linkedinUrl || 'Not provided'}

Be concise, professional, and actionable in your responses.`;
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
*   **Name:** ${user.name}
*   **Age:** ${user.age}
*   **Profession:** ${user.profession}
*   **Education:** ${user.educationLevel}
*   **Target Role:** ${user.targetRole}
*   **Existing Skills:** ${(user.skills || []).map(s => `${s.name} (${s.proficiency})`).join(', ')}.
*   **Identified Skill Gaps:** ${skillGaps.join(', ') || 'None identified yet.'}
*   **Roadmap Progress:**
    *   **Completed:** ${completedSteps.join(', ') || 'No steps completed yet.'}
    *   **Next Steps:** ${incompleteSteps.join(', ') || 'No roadmap defined yet.'}

**Your Proactive Responsibilities:**
1.  **Contextualize Advice:** Given they are a ${user.age}-year-old ${user.profession} with a ${user.educationLevel} degree, your advice should be practical for their life stage.
2.  **Suggest Next Steps:** Based on their completed roadmap items and remaining skill gaps, proactively suggest what they could focus on next. For example: "I see you've finished the 'Data Fundamentals' milestone! That's awesome 🎉. A great next step would be to tackle a project using Python's Pandas library to solidify those skills. Want some project ideas?"
3.  **Offer Resources:** When they mention a skill or a topic from their roadmap, offer to find relevant articles, tutorials, or courses.
4.  **Connect to Goals:** Always tie your advice back to their goal of becoming a ${user.targetRole}. Explain *why* a skill or project is important for that career path.
5.  **Check In:** If the chat is idle, you can initiate with a check-in, like "Hey ${user.name}, how's the progress on the '${incompleteSteps[0] || 'next'}' part of your roadmap going? Anything I can help with?"

Keep your answers concise but impactful. Your goal is to be a true copilot on their career journey. Let's go! 🚀`;
                    break;
            }
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

        return () => {
            const messagesToSave = messagesRef.current;
            if (messagesToSave.length > 1) { // More than just the initial model message
                const session: ChatSession = {
                    date: new Date().toISOString(),
                    mode: modeForThisSession,
                    messages: messagesToSave.filter(m => m.text !== 'TYPING_INDICATOR')
                };
                if (session.messages.length > 1) {
                    onSaveHistory(session);
                }
            }
        };
    }, [user, chatMode, onSaveHistory]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, selectedHistory]);

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
        setMessages(prev => [...prev, { role: 'model', text: 'TYPING_INDICATOR' }]);
        
        try {
            if (chat) { 
                const responseStream = await chat.sendMessageStream({ message: currentInput });
                let modelResponseText = '';
                let responseReceived = false;

                for await (const chunk of responseStream) {
                    responseReceived = true;
                    modelResponseText += chunk.text;
                    setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage) lastMessage.text = modelResponseText;
                        return newMessages;
                    });
                }
                
                if (!responseReceived) {
                     setMessages(prev => prev.filter(m => m.text !== 'TYPING_INDICATOR'));
                }
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setMessages(prev => [...prev.filter(m => m.text !== 'TYPING_INDICATOR'), { role: 'model', text: "Oops! Something went wrong. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderChatContent = (msgs: ChatMessage[]) => (
        msgs.map((msg, index) => (
            <div key={index}>
                <div className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'model' && <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 flex-shrink-0 flex items-center justify-center shadow-lg"><SparklesIcon className="w-5 h-5"/></div>}
                    <div className={`max-w-xl px-5 py-3 rounded-2xl shadow-md ${msg.role === 'user' ? 'bg-cyan-600 rounded-br-none' : 'bg-slate-700/80 rounded-bl-none'}`}>
                        {msg.text === 'TYPING_INDICATOR' ? (
                            <TypingIndicator />
                        ) : (
                            <p className="text-white whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        )}
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
        ))
    );
    
    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto p-4 fade-in">
             <header className="text-center mb-4 shrink-0">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
                    <SparklesIcon className="text-teal-400 w-8 h-8" />
                    {viewMode === 'chat' ? 'Smart Chat' : 'Chat History'}
                </h1>
                <p className="text-slate-400 mt-1">
                     {viewMode === 'chat' ? 'Your personal guide for career questions.' : 'Review your past conversations.'}
                </p>
            </header>
            
            {viewMode === 'chat' && (
                <div className="flex justify-center items-center gap-2 mb-4 p-1 bg-slate-800/70 border border-slate-700 rounded-lg shrink-0">
                    <ChatModeButton mode="mentor" current={chatMode} setMode={setChatMode} label="Mentor" />
                    <ChatModeButton mode="web" current={chatMode} setMode={setChatMode} label="Web Search" />
                    <ChatModeButton mode="networking" current={chatMode} setMode={setChatMode} label="Networking" Icon={LinkedInIcon}/>
                    <ChatModeButton mode="deep" current={chatMode} setMode={setChatMode} label="Deep Dive" Icon={BrainIcon}/>
                     <button onClick={() => setViewMode('history')} className="px-3 py-1.5 text-sm font-semibold text-slate-300 hover:bg-slate-700/50 rounded-md" title="View History"><HistoryIcon/></button>
                </div>
            )}

            {viewMode === 'chat' ? (
                <>
                    <div ref={chatContainerRef} className="flex-grow overflow-y-auto bg-slate-900/30 rounded-lg p-4 space-y-6">
                        {renderChatContent(messages)}
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
                </>
            ) : (
                <div className="flex-grow flex flex-col">
                    {selectedHistory ? (
                         <>
                            <button onClick={() => setSelectedHistory(null)} className="mb-4 self-start px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600 rounded-lg">← Back to History</button>
                            <div ref={chatContainerRef} className="flex-grow overflow-y-auto bg-slate-900/30 rounded-lg p-4 space-y-6">
                                {renderChatContent(selectedHistory)}
                            </div>
                        </>
                    ) : (
                         <>
                            <button onClick={() => setViewMode('chat')} className="mb-4 self-start px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600 rounded-lg">← Back to Chat</button>
                            <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                                {(user.smartChatHistory || []).slice().reverse().map((session, index) => (
                                    <button key={index} onClick={() => setSelectedHistory(session.messages)} className="w-full text-left p-4 bg-slate-800/70 hover:bg-slate-800 rounded-lg transition-colors">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold text-slate-200 capitalize">Chat ({session.mode})</p>
                                            <p className="text-xs text-slate-500">{new Date(session.date).toLocaleString()}</p>
                                        </div>
                                        <p className="text-sm text-slate-400 mt-1 truncate">{session.messages.find(m => m.role === 'user')?.text || 'Chat with AI Mentor'}</p>
                                    </button>
                                ))}
                                {(!user.smartChatHistory || user.smartChatHistory.length === 0) && <p className="text-center text-slate-400 py-10">No chat history yet.</p>}
                            </div>
                         </>
                    )}
                </div>
            )}
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