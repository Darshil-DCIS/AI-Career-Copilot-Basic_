import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import type { UserProfile, ChatMessage, InterviewSession } from '../types';
import { SendIcon, InterviewIcon, HistoryIcon, BrainIcon } from './icons';
import Card from './common/Card';
import { summarizeInterview } from '../services/geminiService';

interface InterviewCoachProps {
    user: UserProfile;
    onSaveInterview: (session: InterviewSession) => void;
}

const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error("API_KEY environment variable not set");
const ai = new GoogleGenAI({ apiKey: API_KEY });

type View = 'start' | 'interview' | 'summary' | 'history';

const InterviewCoach: React.FC<InterviewCoachProps> = ({ user, onSaveInterview }) => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState<View>('start');
    const [summary, setSummary] = useState<string>('');
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const startInterview = async () => {
        setIsLoading(true);
        setView('interview');
        
        const systemInstruction = `You are an expert AI Interviewer conducting a realistic mock interview with ${user.name} for a "${user.targetRole}" position.
        Your process is as follows:
        1. Start the interview by introducing yourself and setting the stage.
        2. Ask one question at a time. Mix behavioral questions (like "Tell me about a time you faced a challenge"), technical questions, and situational questions relevant to the role.
        3. After the user answers, critically evaluate their response. If it's a good answer, acknowledge it. If it's brief or lacks detail, ask ONE probing follow-up question to encourage them to elaborate (e.g., "Could you tell me more about the outcome?", "What was your specific role in that project?").
        4. After their response to the follow-up (or their initial good answer), provide brief, constructive feedback (1-2 sentences).
        5. Seamlessly transition to the next, different question. Do not number the questions.
        6. Maintain a professional, encouraging, yet evaluative tone. Let's begin the interview.`;

        const newChat = ai.chats.create({ model: 'gemini-2.5-pro', config: { systemInstruction } });
        setChat(newChat);

        try {
            const responseStream = await newChat.sendMessageStream({ message: `Let's begin the mock interview for the ${user.targetRole} role. Good luck, ${user.name}!` });
            let modelResponseText = '';
            setMessages([{ role: 'model', text: '' }]);

            for await (const chunk of responseStream) {
                modelResponseText += chunk.text;
                setMessages([{ role: 'model', text: modelResponseText }]);
            }
        } catch (error) {
            console.error("Error starting interview:", error);
            setMessages([{ role: 'model', text: "Oops! I had a problem starting. Please try again." }]);
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
            setMessages(prev => [...prev, { role: 'model', text: "Oops! Something went wrong." }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const endInterview = async () => {
        if (messages.length <= 1) { // Only initial message exists
            setView('start');
            setMessages([]);
            return;
        }
        setIsLoading(true);
        const feedbackSummary = await summarizeInterview(messages, user.targetRole);
        setSummary(feedbackSummary);
        const session: InterviewSession = {
            date: new Date().toISOString(),
            targetRole: user.targetRole,
            transcript: messages,
            feedbackSummary,
        };
        onSaveInterview(session);
        setView('summary');
        setIsLoading(false);
        setChat(null);
    };

    const renderContent = () => {
        switch (view) {
            case 'start':
                return (
                    <div className="flex items-center justify-center h-full p-4 fade-in">
                        <Card className="text-center max-w-lg">
                            <InterviewIcon className="w-20 h-20 mx-auto text-teal-400" />
                            <h1 className="text-3xl font-bold mt-4">AI Interview Coach</h1>
                            <p className="text-slate-400 mt-2 text-lg">Practice for your next interview for the <span className="font-semibold text-cyan-300">{user.targetRole}</span> role.</p>
                            <div className="flex gap-4 mt-8">
                                <button onClick={startInterview} disabled={isLoading} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg">
                                    {isLoading ? 'Preparing...' : 'Start Mock Interview'}
                                </button>
                                <button onClick={() => setView('history')} disabled={(user.interviewHistory || []).length === 0} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-slate-600 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-opacity">
                                    <HistoryIcon /> View History
                                </button>
                            </div>
                        </Card>
                    </div>
                );
            case 'interview':
                return (
                    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 fade-in">
                        <header className="text-center mb-4 shrink-0 flex justify-between items-center">
                            <h1 className="text-2xl font-bold flex items-center gap-3"><InterviewIcon className="text-teal-400" /> Mock Interview</h1>
                            <button onClick={endInterview} className="px-4 py-2 font-semibold bg-red-600 hover:bg-red-700 rounded-lg transition-colors">End Interview</button>
                        </header>
                        <div ref={chatContainerRef} className="flex-grow overflow-y-auto bg-slate-900/30 rounded-lg p-4 space-y-6">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                    {msg.role === 'model' && <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 flex-shrink-0 flex items-center justify-center shadow-lg"><InterviewIcon className="w-5 h-5"/></div>}
                                    <div className={`max-w-xl px-5 py-3 rounded-2xl shadow-md ${msg.role === 'user' ? 'bg-cyan-600 rounded-br-none' : 'bg-slate-700/80 rounded-bl-none'}`}>
                                       <p className="text-white whitespace-pre-wrap leading-relaxed">{msg.text}{isLoading && msg.role === 'model' && index === messages.length - 1 ? '...' : ''}</p>
                                    </div>
                                     {msg.role === 'user' && <div className="w-9 h-9 rounded-full bg-slate-600 flex-shrink-0 flex items-center justify-center shadow-lg font-bold">{user.name.charAt(0)}</div>}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center gap-3 p-2 bg-slate-800/80 border border-slate-700 rounded-xl shrink-0">
                            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Type your answer here..." className="w-full bg-transparent focus:outline-none p-2" disabled={isLoading} />
                            <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-2.5 rounded-lg bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed hover:bg-cyan-700 transition-colors"><SendIcon className="w-5 h-5" /></button>
                        </div>
                    </div>
                );
            case 'summary':
                 return (
                    <div className="max-w-4xl mx-auto p-4 sm:p-8 fade-in">
                         <Card>
                            <h1 className="text-3xl font-bold flex items-center gap-3 mb-4"><BrainIcon className="text-teal-400" /> Interview Summary</h1>
                            <div className="prose prose-invert prose-p:text-slate-300 prose-headings:text-slate-100 prose-strong:text-cyan-300 mt-4" dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br />') }} />
                             <div className="flex gap-4 mt-8">
                                <button onClick={() => { setMessages([]); setView('start'); }} className="flex-1 px-6 py-3 font-semibold bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors">Done</button>
                                <button onClick={() => setView('history')} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-slate-600 rounded-lg hover:bg-slate-700 transition-opacity">
                                    <HistoryIcon /> View All History
                                </button>
                            </div>
                         </Card>
                    </div>
                 );
            case 'history':
                return (
                     <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6 fade-in">
                        <header className="flex justify-between items-center">
                             <h1 className="text-3xl font-bold flex items-center gap-3"><HistoryIcon /> Interview History</h1>
                             <button onClick={() => setView('start')} className="px-4 py-2 font-semibold bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors">Back</button>
                        </header>
                         {(user.interviewHistory || []).map(session => (
                            <Card key={session.date}>
                                <h2 className="text-xl font-bold text-cyan-300">{session.targetRole}</h2>
                                <p className="text-sm text-slate-400 mb-4">{new Date(session.date).toLocaleString()}</p>
                                <h3 className="font-semibold text-slate-200 mb-2">Feedback Summary:</h3>
                                <div className="prose prose-sm prose-invert prose-p:text-slate-400 max-h-40 overflow-y-auto" dangerouslySetInnerHTML={{ __html: session.feedbackSummary.replace(/\n/g, '<br />') }} />
                            </Card>
                         ))}
                    </div>
                )
        }
    }
    
    return <div className="h-full w-full">{renderContent()}</div>;
};

export default InterviewCoach;
