import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import type { UserProfile, ChatMessage } from '../types';
import { SendIcon, InterviewIcon } from './icons';
import Card from './common/Card';

interface InterviewCoachProps {
    user: UserProfile;
}

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const InterviewCoach: React.FC<InterviewCoachProps> = ({ user }) => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [interviewStarted, setInterviewStarted] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const startInterview = async () => {
        setIsLoading(true);
        setInterviewStarted(true);
        
        const systemInstruction = `You are an expert AI Interview Coach. Your user, ${user.name}, is preparing for a "${user.targetRole}" position.
        Your task is to conduct a mock interview.
        1. Start by asking one common behavioral or technical question relevant to the ${user.targetRole} role.
        2. Wait for the user's response.
        3. After they answer, provide brief, constructive feedback. Comment on the answer's structure (like the STAR method for behavioral questions), clarity, and technical accuracy. Keep feedback to 2-3 sentences.
        4. After giving feedback, ask the next interview question.
        5. Maintain a professional but encouraging tone. Use emojis sparingly. Let's begin the interview.`;

        const newChat = ai.chats.create({
            model: 'gemini-2.5-pro',
            config: { systemInstruction },
        });
        setChat(newChat);

        const initialMessage = `Hello ${user.name}! I'm your AI Interview Coach. I'll ask you some questions for the ${user.targetRole} role. Let's start.`;
        try {
            const responseStream = await newChat.sendMessageStream({ message: initialMessage });
            let modelResponseText = '';
            setMessages([{ role: 'model', text: '' }]);

            for await (const chunk of responseStream) {
                modelResponseText += chunk.text;
                setMessages([{ role: 'model', text: modelResponseText }]);
            }
        } catch (error) {
            console.error("Error starting interview:", error);
            setMessages([{ role: 'model', text: "Oops! I had a problem starting the interview. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || !chat || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
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
        } catch (error) {
            console.error("Error sending message:", error);
            setMessages(prev => [...prev, { role: 'model', text: "Oops! Something went wrong. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!interviewStarted) {
        return (
            <div className="flex items-center justify-center h-full p-4">
                <Card className="text-center max-w-lg">
                    <InterviewIcon className="w-20 h-20 mx-auto text-purple-400" />
                    <h1 className="text-3xl font-bold mt-4">AI Interview Coach</h1>
                    <p className="text-slate-400 mt-2 text-lg">Practice for your next interview. Get instant feedback on your answers for the <span className="font-semibold text-blue-300">{user.targetRole}</span> role.</p>
                    <button
                        onClick={startInterview}
                        disabled={isLoading}
                        className="mt-8 w-full inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg"
                    >
                        {isLoading ? 'Preparing...' : 'Start Mock Interview'}
                    </button>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
            <header className="text-center mb-4 shrink-0">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
                    <InterviewIcon className="text-purple-400 w-8 h-8" />
                    Mock Interview: {user.targetRole}
                </h1>
            </header>
            <div ref={chatContainerRef} className="flex-grow overflow-y-auto bg-slate-900/30 rounded-lg p-4 space-y-6">
                 {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'model' && <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center shadow-lg"><InterviewIcon className="w-5 h-5"/></div>}
                        <div className={`max-w-xl px-5 py-3 rounded-2xl shadow-md ${msg.role === 'user' ? 'bg-blue-600 rounded-br-none' : 'bg-slate-700/80 rounded-bl-none'}`}>
                           <p className="text-white whitespace-pre-wrap leading-relaxed">{msg.text}{isLoading && msg.role === 'model' && index === messages.length - 1 ? '...' : ''}</p>
                        </div>
                    </div>
                ))}
            </div>
             <div className="mt-4 flex items-center gap-3 p-2 bg-slate-800/80 border border-slate-700 rounded-xl shrink-0">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type your answer here..."
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

export default InterviewCoach;