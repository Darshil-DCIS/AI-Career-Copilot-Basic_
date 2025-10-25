import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import type { UserProfile, ChatMessage, InterviewSession, QuizSession, QuizQuestion } from '../types';
import { SendIcon, InterviewIcon, HistoryIcon, BrainIcon, LightbulbIcon } from './icons';
import Card from './common/Card';
import { summarizeInterview, getQuizTopics, generateQuizQuestion } from '../services/geminiService';
import ProgressBar from './common/ProgressBar';

interface InterviewCoachProps {
    user: UserProfile;
    onSaveInterview: (session: InterviewSession) => void;
    onSaveQuiz: (session: QuizSession) => void;
}

const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error("API_KEY environment variable not set");
// FIX: Correctly instantiate GoogleGenAI with a named apiKey parameter as per the guidelines.
const ai = new GoogleGenAI({ apiKey: API_KEY });

type View = 'start' | 'interview' | 'summary' | 'history' | 'quiz-setup' | 'quiz-active' | 'quiz-summary';

const InterviewCoach: React.FC<InterviewCoachProps> = ({ user, onSaveInterview, onSaveQuiz }) => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState<View>('start');
    const [summary, setSummary] = useState<string>('');
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Quiz State
    const [quizTopics, setQuizTopics] = useState<string[]>([]);
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [quizQuestions, setQuizQuestions] = useState<{ question: QuizQuestion; userAnswer: string; isCorrect: boolean }[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [answerStatus, setAnswerStatus] = useState<'correct' | 'incorrect' | null>(null);
    const [quizEnded, setQuizEnded] = useState(false);

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

        // FIX: Updated deprecated model name to the recommended version.
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

    // Quiz Functions
    const startQuizSetup = async () => {
        setIsLoading(true);
        setView('quiz-setup');
        const topics = await getQuizTopics(user.targetRole);
        setQuizTopics(topics);
        setIsLoading(false);
    };

    const handleTopicToggle = (topic: string) => {
        setSelectedTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
    };

    const startQuiz = async () => {
        setIsLoading(true);
        setQuizQuestions([]);
        setQuizEnded(false);
        setView('quiz-active');
        await fetchNextQuestion();
        setIsLoading(false);
    };

    const fetchNextQuestion = async () => {
        setIsLoading(true);
        setSelectedAnswer(null);
        setAnswerStatus(null);
        const asked = quizQuestions.map(q => q.question.question);
        const nextQ = await generateQuizQuestion(selectedTopics, asked);
        if (nextQ) {
            setCurrentQuestion(nextQ);
        } else {
            setQuizEnded(true); // No more questions available
        }
        setIsLoading(false);
    };
    
    const handleAnswerSubmit = () => {
        if (!selectedAnswer || !currentQuestion) return;
        const isCorrect = selectedAnswer === currentQuestion.answer;
        setAnswerStatus(isCorrect ? 'correct' : 'incorrect');
        setQuizQuestions(prev => [...prev, { question: currentQuestion, userAnswer: selectedAnswer, isCorrect }]);
    };
    
    const endQuiz = () => {
        const correctAnswers = quizQuestions.filter(q => q.isCorrect).length;
        const score = quizQuestions.length > 0 ? Math.round((correctAnswers / quizQuestions.length) * 100) : 0;
        const session: QuizSession = {
            date: new Date().toISOString(),
            targetRole: user.targetRole,
            topics: selectedTopics,
            questions: quizQuestions,
            score,
        };
        onSaveQuiz(session);
        setView('quiz-summary');
    };

    const resetQuiz = () => {
        setQuizTopics([]);
        setSelectedTopics([]);
        setQuizQuestions([]);
        setCurrentQuestion(null);
        setSelectedAnswer(null);
        setAnswerStatus(null);
        setQuizEnded(false);
    }
    
    const renderContent = () => {
        switch (view) {
            case 'start':
                return (
                    <div className="flex items-center justify-center h-full p-4 fade-in">
                        <Card className="text-center max-w-lg">
                            <InterviewIcon className="w-20 h-20 mx-auto text-teal-400" />
                            <h1 className="text-3xl font-bold mt-4">AI Interview Coach</h1>
                            <p className="text-slate-400 mt-2 text-lg">Practice for your next interview for the <span className="font-semibold text-cyan-300">{user.targetRole}</span> role.</p>
                            <div className="flex flex-col sm:flex-row gap-4 mt-8">
                                <button onClick={startInterview} disabled={isLoading} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg">
                                    {isLoading ? 'Preparing...' : 'Start Mock Interview'}
                                </button>
                                 <button onClick={startQuizSetup} disabled={isLoading} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg">
                                    <LightbulbIcon /> {isLoading ? 'Loading...' : 'Start Quiz'}
                                </button>
                            </div>
                            <button onClick={() => setView('history')} disabled={(user.interviewHistory || []).length === 0 && (user.quizHistory || []).length === 0} className="w-full mt-4 inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-slate-600 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-opacity">
                                <HistoryIcon /> View History
                            </button>
                        </Card>
                    </div>
                );
             case 'quiz-setup':
                return (
                    <div className="flex items-center justify-center h-full p-4 fade-in">
                        <Card className="max-w-lg w-full">
                             <h1 className="text-2xl font-bold flex items-center gap-3 mb-2"><LightbulbIcon className="text-amber-400"/> Quiz Setup</h1>
                             <p className="text-slate-400 mb-6">Select the topics you want to be quizzed on for your <span className="font-semibold text-cyan-300">{user.targetRole}</span> interview.</p>
                             {isLoading ? <div className="text-center py-8">Loading topics...</div> : (
                                <div className="space-y-3">
                                    {quizTopics.map(topic => (
                                        <label key={topic} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors">
                                            <input type="checkbox" checked={selectedTopics.includes(topic)} onChange={() => handleTopicToggle(topic)} className="w-5 h-5 bg-slate-700 border-slate-600 rounded text-teal-500 focus:ring-teal-600" />
                                            <span className="font-medium text-slate-200">{topic}</span>
                                        </label>
                                    ))}
                                </div>
                             )}
                             <div className="flex gap-4 mt-8">
                                <button onClick={() => { setView('start'); resetQuiz(); }} className="flex-1 px-6 py-3 font-semibold bg-slate-600 hover:bg-slate-700 rounded-lg">Back</button>
                                <button onClick={startQuiz} disabled={selectedTopics.length === 0 || isLoading} className="flex-1 px-6 py-3 font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50">Start Quiz</button>
                             </div>
                        </Card>
                    </div>
                );
             case 'quiz-active':
                 return (
                     <div className="flex items-center justify-center h-full p-4 fade-in">
                         <Card className="max-w-2xl w-full">
                            {isLoading && !currentQuestion ? <div className="text-center py-10">Generating question...</div> : currentQuestion ? (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h1 className="text-2xl font-bold">Quiz</h1>
                                        <span className="font-semibold text-lg">{quizQuestions.length + 1} / 10</span>
                                    </div>
                                    <ProgressBar value={quizQuestions.length} max={10} colorClass="bg-amber-500" />
                                    <p className="text-slate-200 text-lg my-6 min-h-[6rem]">{currentQuestion.question}</p>
                                    <div className="space-y-3">
                                        {currentQuestion.options.map(option => {
                                            const isSelected = selectedAnswer === option;
                                            let buttonClass = 'bg-slate-800/70 hover:bg-slate-700/70';
                                            if (answerStatus && isSelected && answerStatus === 'incorrect') buttonClass = 'bg-red-500/80';
                                            if (answerStatus && option === currentQuestion.answer) buttonClass = 'bg-green-500/80';

                                            return (
                                                <button key={option} onClick={() => !answerStatus && setSelectedAnswer(option)} disabled={!!answerStatus} className={`w-full text-left p-4 rounded-lg transition-colors ${buttonClass} ${isSelected ? 'ring-2 ring-cyan-400' : ''} ${answerStatus ? 'cursor-not-allowed' : ''}`}>
                                                    {option}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {answerStatus && (
                                        <div className={`mt-4 p-4 rounded-lg ${answerStatus === 'correct' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                            <h3 className={`font-bold ${answerStatus === 'correct' ? 'text-green-300' : 'text-red-300'}`}>{answerStatus === 'correct' ? "Correct!" : "Incorrect."}</h3>
                                            <p className="text-sm text-slate-300 mt-1">{currentQuestion.explanation}</p>
                                        </div>
                                    )}

                                    <div className="mt-8 flex gap-4">
                                        <button onClick={endQuiz} className="px-6 py-3 font-semibold bg-slate-600 hover:bg-slate-700 rounded-lg">End Quiz</button>
                                        {answerStatus ? (
                                            quizQuestions.length < 10 && !quizEnded ? (
                                                <button onClick={fetchNextQuestion} className="flex-1 px-6 py-3 font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg">Next Question</button>
                                            ) : (
                                                <button onClick={endQuiz} className="flex-1 px-6 py-3 font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg">View Results</button>
                                            )
                                        ) : (
                                            <button onClick={handleAnswerSubmit} disabled={!selectedAnswer} className="flex-1 px-6 py-3 font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50">Submit</button>
                                        )}
                                    </div>
                                </div>
                            ) : <div className="text-center py-10">Finished!</div>}
                         </Card>
                     </div>
                 );
            case 'quiz-summary':
                 const score = useMemo(() => quizQuestions.length > 0 ? Math.round(quizQuestions.filter(q => q.isCorrect).length / quizQuestions.length * 100) : 0, [quizQuestions]);
                 const scoreColor = score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
                 return (
                     <div className="max-w-3xl mx-auto p-4 sm:p-8 fade-in">
                        <Card>
                            <h1 className="text-3xl font-bold text-center mb-4">Quiz Results</h1>
                             <div className="text-center mb-8 bg-slate-900/50 p-6 rounded-xl">
                                <p className="text-slate-300 font-semibold text-lg">Final Score</p>
                                <p className={`text-7xl font-bold ${scoreColor}`}>{score}<span className="text-3xl text-slate-400">%</span></p>
                            </div>
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                {quizQuestions.map((q, i) => (
                                    <div key={i} className="p-3 bg-slate-800/70 rounded-lg">
                                        <p className="font-semibold">{i+1}. {q.question.question}</p>
                                        <p className={`text-sm mt-1 ${q.isCorrect ? 'text-green-400' : 'text-red-400'}`}>Your answer: {q.userAnswer} {q.isCorrect ? '✓' : '✗'}</p>
                                        {!q.isCorrect && <p className="text-sm text-slate-400">Correct answer: {q.question.answer}</p>}
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-4 mt-8">
                                <button onClick={() => { setView('start'); resetQuiz(); }} className="flex-1 px-6 py-3 font-semibold bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors">Done</button>
                                <button onClick={() => setView('history')} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-slate-600 rounded-lg hover:bg-slate-700 transition-opacity">
                                    <HistoryIcon /> View All History
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
                             <h1 className="text-3xl font-bold flex items-center gap-3"><HistoryIcon /> Session History</h1>
                             <button onClick={() => {setView('start'); resetQuiz();}} className="px-4 py-2 font-semibold bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors">Back</button>
                        </header>
                        <div>
                            <h2 className="text-2xl font-bold mb-3 text-cyan-300">Mock Interviews</h2>
                            {(user.interviewHistory || []).map(session => (
                                <Card key={session.date} className="mb-4">
                                    <h3 className="text-xl font-bold text-slate-100">{session.targetRole}</h3>
                                    <p className="text-sm text-slate-400 mb-4">{new Date(session.date).toLocaleString()}</p>
                                    <h4 className="font-semibold text-slate-200 mb-2">Feedback Summary:</h4>
                                    <div className="prose prose-sm prose-invert prose-p:text-slate-400 max-h-40 overflow-y-auto" dangerouslySetInnerHTML={{ __html: session.feedbackSummary.replace(/\n/g, '<br />') }} />
                                </Card>
                            ))}
                            {(user.interviewHistory || []).length === 0 && <p className="text-slate-400">No mock interview history.</p>}
                        </div>
                        <div className="mt-8">
                             <h2 className="text-2xl font-bold mb-3 text-amber-300">Quizzes</h2>
                              {(user.quizHistory || []).map(session => (
                                <Card key={session.date} className="mb-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-100">{session.targetRole} Quiz</h3>
                                            <p className="text-sm text-slate-400">{new Date(session.date).toLocaleString()}</p>
                                            <p className="text-sm text-slate-400">Topics: {session.topics.join(', ')}</p>
                                        </div>
                                        <p className="text-3xl font-bold">{session.score}%</p>
                                    </div>
                                </Card>
                            ))}
                            {(user.quizHistory || []).length === 0 && <p className="text-slate-400">No quiz history.</p>}
                        </div>
                    </div>
                )
        }
    }
    
    return <div className="h-full w-full">{renderContent()}</div>;
};

export default InterviewCoach;