import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, LiveSession } from '@google/genai';
import { decode, encode, decodeAudioData } from '../utils/audioUtils';
import type { UserProfile } from '../types';
import Card from './common/Card';

const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error("API_KEY environment variable not set");
const ai = new GoogleGenAI({ apiKey: API_KEY });

type Status = 'IDLE' | 'CONNECTING' | 'LISTENING' | 'SPEAKING' | 'ERROR';

const VoiceMentor: React.FC<{ user: UserProfile }> = ({ user }) => {
    const [status, setStatus] = useState<Status>('IDLE');
    const [error, setError] = useState<string | null>(null);
    
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
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
             audioContextRef.current.close();
        }
        scriptProcessorRef.current = null;
        mediaStreamSourceRef.current = null;
        audioContextRef.current = null;
    }, []);

    const startSession = async () => {
        setStatus('CONNECTING');
        setError(null);

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
                },
                callbacks: {
                    onopen: () => {
                        setStatus('LISTENING');
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;
                        
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (event) => {
                            const inputData = event.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (audioData) {
                            setStatus('SPEAKING');
                            const decoded = decode(audioData);
                            const audioBuffer = await decodeAudioData(decoded, outputAudioContext, 24000, 1);
                            
                            const sourceNode = outputAudioContext.createBufferSource();
                            sourceNode.buffer = audioBuffer;
                            sourceNode.connect(outputAudioContext.destination);
                            
                            const currentTime = outputAudioContext.currentTime;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, currentTime);
                            sourceNode.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioQueueRef.current.add(sourceNode);
                            sourceNode.onended = () => {
                                audioQueueRef.current.delete(sourceNode);
                                if (audioQueueRef.current.size === 0) {
                                    setStatus('LISTENING');
                                }
                            };
                        }
                    },
                    onerror: (e) => {
                        console.error('Session error:', e);
                        setError('An error occurred with the connection.');
                        setStatus('ERROR');
                        cleanUpAudio();
                    },
                    onclose: () => {
                       cleanUpAudio();
                    },
                }
            });
        } catch (err) {
            console.error('Failed to start session:', err);
            setError('Could not access microphone. Please check permissions.');
            setStatus('ERROR');
        }
    };
    
    const stopSession = async () => {
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) {
                 console.error("Error closing session", e);
            }
            sessionPromiseRef.current = null;
        }
        cleanUpAudio();
        setStatus('IDLE');
    };

    useEffect(() => {
        return () => {
           stopSession();
        };
    }, []);

    const createBlob = (data: Float32Array): Blob => {
        const int16 = new Int16Array(data.length);
        for (let i = 0; i < data.length; i++) {
            int16[i] = data[i] * 32768;
        }
        return {
            data: encode(new Uint8Array(int16.buffer)),
            mimeType: 'audio/pcm;rate=16000',
        };
    };

    const StatusIndicator = () => {
         const baseClasses = "w-48 h-48 rounded-full transition-all duration-300 flex items-center justify-center text-center p-4";
         const colorClasses = {
            IDLE: 'bg-slate-700/50',
            CONNECTING: 'bg-blue-500/50 animate-pulse',
            LISTENING: 'bg-green-500/50 scale-105 animate-pulse',
            SPEAKING: 'bg-purple-500/50 scale-110',
            ERROR: 'bg-red-500/50',
         };
         
         const text = {
            IDLE: 'Ready to Start',
            CONNECTING: 'Connecting...',
            LISTENING: 'Listening...',
            SPEAKING: 'AI is Speaking...',
            ERROR: 'Error Occurred',
         };

        return (
            <div className={`relative ${baseClasses} ${colorClasses[status]}`}>
                 <div className={`absolute inset-0 rounded-full ${colorClasses[status]} filter blur-2xl`}></div>
                 <span className="relative text-xl font-semibold">{text[status]}</span>
            </div>
        )
    };

    return (
         <div className="flex items-center justify-center h-full p-4">
            <Card className="text-center max-w-lg w-full flex flex-col items-center">
                <h1 className="text-3xl font-bold">Voice Mentor</h1>
                <p className="text-slate-400 mt-1 mb-8">Talk to your AI career coach in real-time.</p>
                
                <div className="h-48 w-48 my-8 flex items-center justify-center">
                   <StatusIndicator />
                </div>
                
                {error && <p className="text-red-400 text-sm mb-4 h-5">{error}</p>}
                {!error && <div className="h-5 mb-4"></div>}
                
                {status === 'IDLE' || status === 'ERROR' ? (
                    <button onClick={startSession} className="w-full px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg">
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