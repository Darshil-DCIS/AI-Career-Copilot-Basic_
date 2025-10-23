import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import type { UserProfile, ChatMessage } from '../types';
import { SparklesIcon, SendIcon, BrainIcon } from './icons';

interface SmartChatProps {
    user: UserProfile;
}

type ChatMode = 'mentor' | 'quick' | 'deep';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

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
            const systemInstruction = `You are an AI Career Mentor for a user named ${user.name}. Your tone is friendly, motivating, and slightly playful.
            Your goal is to provide personalized guidance based on the user's profile.
            User's target role: ${user.targetRole}.
            User's skills: ${user.skills.map(s => `${s.name} (${s.proficiency})`).join(', ')}.
            User's current roadmap: Focus on these milestones - ${user.roadmap.filter(r => !r.completed).map(r => r.title).join(', ')}.
            Always keep their profile in mind when answering questions about projects, skills, internships, resume tips, or interview prep. Use emojis to be engaging. Let's go! 🚀`;

            const modelForMode = chatMode === 'quick' ? 'gemini-2.5-flash-lite' : 'gemini-2.5-pro';
            const config: { systemInstruction: string, thinkingConfig?: any } = { systemInstruction };
            if (chatMode === 'deep') {
                config.thinkingConfig = { thinkingBudget: 32768 };
            }

            const newChat = ai.chats.create({ model: modelForMode, config });
            setChat(newChat);
            setMessages([{ role: 'model', text: `Hey ${user.name}! I'm your AI Career Copilot. Ask me anything about your career journey! How can I help you today? ✨` }]);
        };
        initChat();
    }, [user, chatMode]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            if (chatMode === 'quick' && chat) {
                 const response = await chat.sendMessage({ message: input });
                 setMessages(prev => [...prev, { role: 'model', text: response.text }]);
            } else if (chat) { // Mentor and Deep Dive modes
                const responseStream = await chat.sendMessageStream({ message: input });
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
        <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
             <header className="text-center mb-4 shrink-0">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
                    <SparklesIcon className="text-purple-400 w-8 h-8" />
                    Smart Chat
                </h1>
                <p className="text-slate-400 mt-1">Your personal guide for career questions.</p>
            </header>
            
            <div className="flex justify-center items-center gap-2 mb-4 p-1 bg-slate-800/70 border border-slate-700 rounded-lg shrink-0">
                <ChatModeButton mode="mentor" current={chatMode} setMode={setChatMode} label="Mentor" />
                <ChatModeButton mode="quick" current={chatMode} setMode={setChatMode} label="Quick Response" />
                <ChatModeButton mode="deep" current={chatMode} setMode={setChatMode} label="Deep Dive" Icon={BrainIcon}/>
            </div>

            <div ref={chatContainerRef} className="flex-grow overflow-y-auto bg-slate-900/30 rounded-lg p-4 space-y-6">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'model' && <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center shadow-lg"><SparklesIcon className="w-5 h-5"/></div>}
                        <div className={`max-w-xl px-5 py-3 rounded-2xl shadow-md ${msg.role === 'user' ? 'bg-blue-600 rounded-br-none' : 'bg-slate-700/80 rounded-bl-none'}`}>
                            <p className="text-white whitespace-pre-wrap leading-relaxed">{msg.text}{isLoading && msg.role === 'model' && index === messages.length - 1 ? '...' : ''}</p>
                        </div>
                    </div>
                ))}
                 {isLoading && chatMode === 'deep' && (
                    <div className="flex justify-center items-center gap-2 text-sm text-purple-300">
                        <BrainIcon className="w-5 h-5 animate-pulse" />
                        Engaging deep thought... this may take a moment.
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
                    className="p-2.5 rounded-lg bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
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
        className={`flex-1 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${current === mode ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-slate-300 hover:bg-slate-700/50'}`}
    >
       {Icon && <Icon className="w-4 h-4" />}
       {label}
    </button>
);


export default SmartChat;