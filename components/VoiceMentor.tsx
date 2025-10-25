import React, { useState, useRef, useEffect, useCallback } from 'react';
// FIX: Removed `LiveSession` as it's not an exported member of the module.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { decode, encode, decodeAudioData } from '../utils/audioUtils';
import type { UserProfile, VoiceSession } from '../types';
import Card from './common/Card';
import { summarizeVoiceSession } from '../services/geminiService';
import { HistoryIcon } from './icons';

const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error("API_KEY environment variable not set");
// FIX: Correctly instantiate GoogleGenAI with a named apiKey parameter as per the guidelines.
const ai = new GoogleGenAI({ apiKey: API_KEY });

type Status = 'IDLE' | 'CONNECTING' | 'LISTENING' | 'SPEAKING' | 'ERROR';
type View = 'live' | 'history';

const VoiceMentor: React.FC<{ user: UserProfile, onSaveSession: (session: VoiceSession) => void }> = ({ user, onSaveSession }) => {
    const [status, setStatus] = useState<Status>('IDLE');
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<View>('live');
    const [transcript, setTranscript] = useState<VoiceSession['transcript']>([]);
    
    // FIX: Used ReturnType to infer the session type from `ai.live.connect` instead of the non-exported `LiveSession`.
    const sessionPromiseRef = useRef<ReturnType<typeof ai.live.connect> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const audioQueueRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const cleanUpAudio = useCallback(() => {
        audioQueueRef.current.forEach(source => source.stop());
        audioQueueRef.current.clear();
        scriptProcessorRef.current?.disconnect();
        mediaStreamSourceRef.current?.disconnect();
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
             audioContextRef.current.close().catch(console.error);
        }
        scriptProcessorRef.current = null;
        mediaStreamSourceRef.current = null;
        audioContextRef.current = null;
    }, []);

    const startSession = async () => {
        setStatus('CONNECTING');
        setError(null);
        setTranscript([]);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = inputAudioContext;
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' }}},
                    systemInstruction: `You are an AI Career Mentor for ${user.name}, who is preparing for a "${user.targetRole}" role. Be encouraging and provide concise, helpful advice.`,
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => { setStatus('LISTENING');
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;
                        scriptProcessor.onaudioprocess = (event) => {
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: createBlob(event.inputBuffer.getChannelData(0)) });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription?.text) {
                            setTranscript(prev => [...prev, { speaker: 'user', text: message.serverContent.inputTranscription.text }]);
                        }
                         if (message.serverContent?.outputTranscription?.text) {
                            setTranscript(prev => [...prev, { speaker: 'model', text: message.serverContent.outputTranscription.text }]);
                        }
                        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (audioData) {
                            setStatus('SPEAKING');
                            const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContext, 24000, 1);
                            const sourceNode = outputAudioContext.createBufferSource();
                            sourceNode.buffer = audioBuffer;
                            sourceNode.connect(outputAudioContext.destination);
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
                            sourceNode.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioQueueRef.current.add(sourceNode);
                            sourceNode.onended = () => {
                                audioQueueRef.current.delete(sourceNode);
                                if (audioQueueRef.current.size === 0) setStatus('LISTENING');
                            };
                        }
                    },
                    onerror: (e) => {
                        console.error('Session error:', e);
                        setError('An error occurred with the connection.');
                        setStatus('ERROR');
                        cleanUpAudio();
                    },
                    onclose: () => { cleanUpAudio(); },
                }
            });
        } catch (err) {
            console.error('Failed to start session:', err);
            setError('Could not access microphone. Please check permissions.');
            setStatus('ERROR');
        }
    };
    
    const stopSession = async () => {
        if (transcript.length > 0) {
            const summary = await summarizeVoiceSession(transcript, user.name, user.targetRole);
            onSaveSession({ date: new Date().toISOString(), transcript, keyTakeaways: summary });
        }
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) { console.error("Error closing session", e); }
            sessionPromiseRef.current = null;
        }
        cleanUpAudio();
        setStatus('IDLE');
        setTranscript([]);
    };

    useEffect(() => { return () => { stopSession(); }; }, []);

    const createBlob = (data: Float32Array): Blob => {
        const int16 = new Int16Array(data.length);
        for (let i = 0; i < data.length; i++) { int16[i] = data[i] * 32768; }
        return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
    };

    const StatusIndicator = () => {
         const baseClasses = "w-48 h-48 rounded-full transition-all duration-300 flex items-center justify-center text-center p-4";
         const colorClasses = { IDLE: 'bg-slate-700/50', CONNECTING: 'bg-cyan-500/50 animate-pulse', LISTENING: 'bg-green-500/50 scale-105 animate-pulse', SPEAKING: 'bg-teal-500/50 scale-110', ERROR: 'bg-red-500/50' };
         const text = { IDLE: 'Ready to Start', CONNECTING: 'Connecting...', LISTENING: 'Listening...', SPEAKING: 'AI is Speaking...', ERROR: 'Error Occurred' };
        return (
            <div className={`relative ${baseClasses} ${colorClasses[status]}`}>
                 <div className={`absolute inset-0 rounded-full ${colorClasses[status]} filter blur-2xl`}></div>
                 <span className="relative text-xl font-semibold">{text[status]}</span>
            </div>
        )
    };

    if (view === 'history') {
        return (
             <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
                <header className="flex justify-between items-center">
                     <h1 className="text-3xl font-bold flex items-center gap-3"><HistoryIcon /> Voice Mentor History</h1>
                     <button onClick={() => setView('live')} className="px-4 py-2 font-semibold bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors">Back</button>
                </header>
                 {(user.voiceMentorHistory || []).length > 0 ? (user.voiceMentorHistory || []).map(session => (
                    <Card key={session.date}>
                        <p className="text-sm text-slate-400 mb-4">{new Date(session.date).toLocaleString()}</p>
                        <h3 className="font-semibold text-slate-200 mb-2">Key Takeaways:</h3>
                        <div className="prose prose-sm prose-invert prose-p:text-slate-400 max-h-40 overflow-y-auto" dangerouslySetInnerHTML={{ __html: session.keyTakeaways.replace(/\n/g, '<br />') }} />
                    </Card>
                 )) : <p className="text-slate-400 text-center py-8">No session history yet.</p>}
            </div>
        )
    }

    return (
         <div className="flex items-center justify-center h-full p-4">
            <Card className="text-center max-w-lg w-full flex flex-col items-center">
                <h1 className="text-3xl font-bold">Voice Mentor</h1>
                <p className="text-slate-400 mt-1 mb-2">Talk to your AI career coach in real-time.</p>
                <button onClick={() => setView('history')} disabled={(user.voiceMentorHistory || []).length === 0} className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed">View Session History</button>
                
                <div className="h-48 w-48 my-8 flex items-center justify-center">
                   <StatusIndicator />
                </div>
                
                {error && <p className="text-red-400 text-sm mb-4 h-5">{error}</p>}
                {!error && <div className="h-5 mb-4"></div>}
                
                {status === 'IDLE' || status === 'ERROR' ? (
                    <button onClick={startSession} className="w-full px-6 py-3 font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg">
                        Start Session
                    </button>
                ) : (
                    <button onClick={stopSession} className="w-full px-6 py-3 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                        End Session
                    </button>
                )}
            </Card>
        </div>
    );
};

export default VoiceMentor;