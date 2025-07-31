import React, { useEffect, useRef, useState } from 'react';
import { getDatabase, ref, remove } from 'firebase/database';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Mic, MicOff, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
    webkitAudioContext?: any;
}

const VoiceCallWithAI = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const navigate = useNavigate();
    const userId = user?.uid;
    const [isMicOn, setIsMicOn] = useState(false);
    const isMicOnRef = useRef(isMicOn);
    const isSpeakingRef = useRef(false);

    useEffect(() => {
        isMicOnRef.current = isMicOn;
    }, [isMicOn]);
    const [status, setStatus] = useState('Idle');
    const [aiResponse, setAIResponse] = useState('');
    const [transcribedText, setTranscribedText] = useState('');
    const [browserSupported, setBrowserSupported] = useState(true);

    const mediaRecorderRef = useRef<any>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recognitionRef = useRef<any>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationIdRef = useRef<number | null>(null);

    const db = getDatabase();
    const callRef = ref(db, `calls/${userId}`);

    useEffect(() => {
        if (!userId) {
            navigate('/login');
            toast("Please login to access this page");
        }
    }, [userId, navigate]);

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            setBrowserSupported(false);
            setStatus('Speech Recognition not supported');
            toast.error('Speech recognition is not supported in this browser. On mobile, only Chrome for Android is supported. iOS Safari and most other mobile browsers do NOT support voice recognition.');
        }

        // Try asking for mic permission on mount
        // navigator.mediaDevices.getUserMedia({ audio: true })
        //     .then(stream => {
        //         stream.getTracks().forEach(track => track.stop());
        //         console.log("Mic permission granted on load");
        //     })
        //     .catch(() => {
        //         console.warn("Mic permission denied on load");
        //     });
    }, []);

    const drawBlackBall = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !analyserRef.current || !canvas) return;

        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationIdRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);
            const volume = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const radius = 30 + volume / 5;
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.fillStyle = 'black';
            ctx.fill();
        };

        draw();
    };

    // Streaming AI response with real-time speech
    const getAIResponse = async (text: string, onChunk?: (chunk: string) => void) => {
        speechSynthesis.cancel();
        try {
            console.log('Fetching AI response for:', text);
            if (!userId) throw new Error('User ID is required for AI request');
            if (!text || text.trim().length === 0) throw new Error('Empty text provided for AI request');
            console.log(`🔍 Fetching AI response for user ${userId} `)
               
            const res = await fetch(`https://ai-consultant-chatbot-371140242198.asia-south1.run.app/chat/text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: uuidv4(), message: text , client_type: "web" }),
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Server Error ${res.status}: ${errorText}`);
            }
            console.log('AI response stream started', res);
            const reader = res.body?.getReader();
            const decoder = new TextDecoder('utf-8');
            let finalMessage = '';
            let sentenceBuffer = '';
            let speaking = false;
            function speakSentence(sentence: string) {
                if (!sentence.trim()) return;
                speaking = true;
                isSpeakingRef.current = true;
                const clean = sentence.replace(/[*#@&^%$!()_+={}\[\]|\\:;"'<>,.?/~`]/g, '');
                const utterance = new SpeechSynthesisUtterance(clean);
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                utterance.lang = 'en-US';
                // Pause recognition while speaking
                if (recognitionRef.current) {
                    try { recognitionRef.current.stop(); } catch (e) {}
                }
                utterance.onend = () => {
                    speaking = false;
                    isSpeakingRef.current = false;
                    // Resume recognition if mic is on and not speaking
                    if (isMicOnRef.current && recognitionRef.current && !isSpeakingRef.current) {
                        try { recognitionRef.current.start(); } catch (e) {}
                    }
                };
                utterance.onerror = () => {
                    speaking = false;
                    isSpeakingRef.current = false;
                    if (isMicOnRef.current && recognitionRef.current && !isSpeakingRef.current) {
                        try { recognitionRef.current.start(); } catch (e) {}
                    }
                };
                window.speechSynthesis.speak(utterance);
            }
            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.replace(/^data:\s*/, '').trim();
                        try {
                            const parsed = JSON.parse(jsonStr);
                            if (parsed.message) {
                                finalMessage += parsed.message;
                                if (onChunk) onChunk(finalMessage);
                                sentenceBuffer += parsed.message;
                                // Speak full sentences as they arrive
                                let match;
                                const sentenceRegex = /[^.!?]*[.!?]/g;
                                while ((match = sentenceRegex.exec(sentenceBuffer)) !== null) {
                                    const sentence = match[0];
                                    speakSentence(sentence);
                                }
                                // Remove spoken sentences from buffer
                                sentenceBuffer = sentenceBuffer.replace(/[^.!?]*[.!?]/g, '');
                            }
                        } catch (e) {
                            // Ignore parse errors for non-JSON lines
                        }
                    }
                }
            }
            // Speak any remaining text in the buffer (in case the last sentence is incomplete)
            if (sentenceBuffer.trim().length > 0) {
                speakSentence(sentenceBuffer);
            }
            if (!finalMessage) throw new Error('No message returned from AI');
            return finalMessage;
        } catch (err) {
            console.error('AI fetch error:', err);
            return 'Error getting response';
        }
    };

    const speakResponse = async (text: string) => {
        return new Promise<void>((resolve) => {
            try {
                // Clean the text
                const clean = text.replace(/[*#@&^%$!()_+={}\[\]|\\:;"'<>,.?/~`]/g, '');
                
                // Create utterance
                const utterance = new SpeechSynthesisUtterance(clean);
                
                // Configure speech settings
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                utterance.lang = 'en-US';

                // Handle speech events
                utterance.onend = () => {
                    resolve();
                };

                utterance.onerror = (event) => {
                    console.error('Speech synthesis error:', event);
                    resolve();
                };

                // Cancel any ongoing speech
                window.speechSynthesis.cancel();
                
                // Start speaking
                window.speechSynthesis.speak(utterance);
            } catch (err) {
                console.error('Error in speech synthesis:', err);
                resolve();
            }
        });
    };

    const startSpeechRecognition = () => {
        try {
            // Get the SpeechRecognition API
            const SpeechRecognition = (window as any).SpeechRecognition || 
                                    (window as any).webkitSpeechRecognition || 
                                    (window as any).mozSpeechRecognition || 
                                    (window as any).msSpeechRecognition;

            if (!SpeechRecognition) {
                setBrowserSupported(false);
                toast.error('Speech recognition not supported in this browser');
                return;
            }

            // Create new recognition instance
            const recognition = new SpeechRecognition();
            
            // Configure recognition settings
            recognition.lang = 'en-US';
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;

            // Handle recognition events
            recognition.onstart = () => {
                setStatus('Listening...');
                console.log('Speech recognition started');
            };

            recognition.onresult = async (event: any) => {
                try {
                    const results = event.results;
                    const lastResult = results[results.length - 1];
                    const transcript = lastResult[0].transcript.trim();
                    const isFinal = lastResult.isFinal;

                    // Clean the transcript
                    const filtered = transcript.replace(/[*#@&^%$!()_+={}\[\]|\\:;"'<>,.?/~`]/g, '');
                    
                    // Update UI with transcript
                    setTranscribedText(filtered);

                    // Process final results
                    if (isFinal && filtered.length > 0) {
                        try {
                            let lastText = '';
                            const response = await getAIResponse(filtered, (partial) => {
                                setAIResponse(partial);
                                lastText = partial;
                            });
                            setAIResponse(response);
                            // Optionally, speak any remaining text not spoken in the stream (edge case)
                            // await speakResponse(response.substring(lastText.length));
                        } catch (err) {
                            console.error('Error processing AI response:', err);
                            toast.error('Error processing response');
                        }
                    }
                } catch (err) {
                    console.error('Error processing speech result:', err);
                }
            };

            // recognition.onerror = (event: any) => {
            //     console.error('Recognition error:', event);
                
            //     // Handle specific error types
            //     switch (event.error) {
            //         case 'no-speech':
            //             toast.error('No speech detected');
            //             break;
            //         case 'aborted':
            //             toast.error('Speech recognition aborted');
            //             break;
            //         case 'audio-capture':
            //             toast.error('No microphone found');
            //             break;
            //         case 'network':
            //             toast.error('Network error occurred');
            //             break;
            //         case 'not-allowed':
            //             toast.error('Microphone access denied');
            //             break;
            //         case 'service-not-allowed':
            //             toast.error('Speech recognition service not allowed');
            //             break;
            //         case 'bad-grammar':
            //             toast.error('Bad grammar in speech');
            //             break;
            //         case 'language-not-supported':
            //             toast.error('Language not supported');
            //             break;
            //         default:
            //             toast.error(`Recognition error: ${event.error}`);
            //     }

            //     setStatus('Error');
                
            //     // Attempt to restart if still active
            //     if (isMicOn) {
            //         setTimeout(() => {
            //             try {
            //                 recognition.start();
            //             } catch (e) {
            //                 console.error('Failed to restart recognition:', e);
            //             }
            //         }, 1000);
            //     }
            // };
recognition.onerror = (event: any) => {
    console.error('Recognition error:', event);

    // Handle known errors gracefully
    const retryableErrors = ['no-speech', 'aborted', 'network'];
    const nonRetryableErrors = ['not-allowed', 'service-not-allowed', 'audio-capture'];

    if (retryableErrors.includes(event.error)) {
        toast.info(`Retrying due to: ${event.error}`);
    } else if (nonRetryableErrors.includes(event.error)) {
        toast.error('Mic access blocked. Please enable mic permissions.');
        setStatus('Mic blocked');
        stopSpeechRecognition();
        return;
    } else {
        toast.error(`Recognition error: ${event.error}`);
    }

    // ✅ Auto-retry if mic is still ON
    if (isMicOnRef.current && !isSpeakingRef.current) {
        console.log('Retrying recognition in 500ms...');
        setTimeout(() => {
            try {
                recognition.start();
            } catch (e) {
                console.error('Recognition restart failed:', e);
            }
        }, 500);
    }
};

            // recognition.onend = () => {
            //     // Only restart if still active and not speaking
            //     if (isMicOnRef.current && !isSpeakingRef.current) {
            //         setTimeout(() => {
            //             try {
            //                 recognition.start();
            //             } catch (e) {
            //                 console.error('Failed to restart recognition:', e);
            //             }
            //         }, 100);
            //     }
            // };
recognition.onend = () => {
    if (isMicOnRef.current && !isSpeakingRef.current) {
        console.log('Recognition ended, restarting...');
        setTimeout(() => {
            try {
                recognition.start();
            } catch (e) {
                console.error('Failed to restart recognition:', e);
            }
        }, 300);
    }
};

            // Store and start recognition
            recognitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            console.error('Error initializing speech recognition:', err);
            toast.error('Failed to initialize speech recognition');
            setBrowserSupported(false);
        }
    };

    const stopSpeechRecognition = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
            setStatus('Mic off');
            setIsMicOn(false);
        }
    };

    // const handleMicToggle = async () => {
    //     if (!browserSupported) {
    //         toast.error('Speech recognition not supported');
    //         return;
    //     }

    //     if (isMicOn) {
    //         stopSpeechRecognition();
    //         window.speechSynthesis.cancel();

    //         if (streamRef.current) {
    //             streamRef.current.getTracks().forEach(track => track.stop());
    //             streamRef.current = null;
    //         }

    //         if (audioContextRef.current) {
    //             await audioContextRef.current.close().catch(console.error);
    //             audioContextRef.current = null;
    //         }

    //         if (animationIdRef.current) {
    //             cancelAnimationFrame(animationIdRef.current);
    //             animationIdRef.current = null;
    //         }

    //         setIsMicOn(false);
    //         setStatus('Mic off');
    //         return;
    //     }

    //     try {
    //         // Request microphone permission first
    //         const stream = await navigator.mediaDevices.getUserMedia({ 
    //             audio: {
    //                 echoCancellation: true,
    //                 noiseSuppression: true,
    //                 autoGainControl: true,
    //                 sampleRate: 44100
    //             } 
    //         });
    //         streamRef.current = stream;

    //         // Create audio context after user interaction (required for mobile)
    //         const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    //         const audioCtx = new AudioContext({
    //             sampleRate: 44100,
    //             latencyHint: 'interactive'
    //         });
    //         audioContextRef.current = audioCtx;

    //         // Resume audio context (required for iOS)
    //         if (audioCtx.state === 'suspended') {
    //             await audioCtx.resume();
    //         }

    //         const analyser = audioCtx.createAnalyser();
    //         analyserRef.current = analyser;

    //         const source = audioCtx.createMediaStreamSource(stream);
    //         source.connect(analyser);
    //         analyser.fftSize = 64;

    //         drawBlackBall();

    //         setIsMicOn(true);
    //         setStatus('Initializing...');
            
    //         // Add a small delay before starting recognition
    //         setTimeout(() => {
    //             startSpeechRecognition();
    //         }, 500);
    //     } catch (err) {
    //         console.error('Mic access error:', err);
    //         toast.error('Mic access denied or failed');
    //         setStatus('Mic access error');
    //     }
    // };
const handleMicToggle = async () => {
    if (!browserSupported) {
        toast.error('Speech recognition not supported');
        return;
    }

    if (isMicOn) {
        stopSpeechRecognition();
        window.speechSynthesis.cancel();

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (audioContextRef.current) {
            await audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }

        if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current);
            animationIdRef.current = null;
        }

        setIsMicOn(false);
        setStatus('Mic off');
        return;
    }

    try {
        // ✅ Request microphone permission only after tap
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 44100,
            },
        });
        streamRef.current = stream;

        // ✅ Create audio context AFTER permission granted
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContext({ sampleRate: 44100, latencyHint: 'interactive' });
        audioContextRef.current = audioCtx;

        // ✅ Resume context (fix for Chrome Android & iOS)
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        const analyser = audioCtx.createAnalyser();
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 64;

        drawBlackBall();

        setIsMicOn(true);
        setStatus('Initializing...');

        // ✅ Delay recognition start (avoid "not-allowed")
        setTimeout(() => {
            startSpeechRecognition();
        }, 300);
    } catch (err) {
        console.error('Mic access error:', err);
        toast.error('Mic access denied or failed');
        setStatus('Mic access error');
    }
};

    const handleClose = async () => {
        stopSpeechRecognition();
        window.speechSynthesis.cancel();

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (audioContextRef.current) {
            await audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }

        if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current);
            animationIdRef.current = null;
        }

        setStatus('Call ended.');
        setIsMicOn(false);
        remove(callRef);
        navigate(-1);
    };

     return (
         <div className="w-full h-screen bg-gradient-to-r flex justify-center items-center relative">
             <div className="bg-white text-black dark:bg-zinc-900 rounded-xl w-full max-w-2xl p-8 space-y-6 relative">
                 <h2 className="text-3xl font-semibold text-center">🎙️ AI Voice Call</h2>
                 <p className="text-lg text-center">{status}</p>
                 {/* {aiResponse && <p className="text-lg text-center">{aiResponse}</p>} */}
                 {transcribedText && <p className="text-lg text-center">Transcribed: {transcribedText}</p>}

                 {!browserSupported && (
                     <div className="bg-red-100 text-red-700 p-4 rounded text-center mb-4">
                         <strong>Voice recognition is not supported in this browser.</strong><br />
                         On mobile, only Chrome for Android is supported.<br />
                         iOS Safari and most other mobile browsers do <b>NOT</b> support voice recognition.<br />
                         Please use a compatible browser for voice chat features.
                     </div>
                 )}

                 <div className="flex justify-center">
                 <canvas ref={canvasRef} width={200} height={200} className="rounded-full bg-transparent" />
                 </div>
                 <div className="flex justify-center space-x-6">
                     <div className="relative group">
                         <button onClick={handleMicToggle} className="p-4 bg-gray-100 rounded-full hover:bg-green-200 transition-all shadow-md">
                             {isMicOn ? <Mic className="h-6 w-6 text-green-600" /> : <MicOff className="h-6 w-6 text-red-600" />}
                         </button>
                         <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-black text-white text-xs px-2 py-1 rounded">
                             {isMicOn ? "Turn Off Mic" : "Turn On Mic"}
                         </div>
                     </div>

                     <button onClick={handleClose} className="p-5 bg-gray-100 rounded-full hover:bg-green-200 transition-all shadow-md" aria-label="End Call">
                         <X className="h-5 w-5 text-black" />
                     </button>
                 </div>
             </div>
             <div className="absolute bottom-0 w-full text-center">
                 <p className="text-sm">Powered by AI Voice Tech</p>
             </div>
         </div>
     );
 };
 
 export default VoiceCallWithAI;