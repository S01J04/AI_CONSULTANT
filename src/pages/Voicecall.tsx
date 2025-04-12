import { useEffect, useRef, useState } from 'react';
import { getDatabase, ref, remove } from 'firebase/database';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Mic, MicOff, X, Volume2, VolumeX, Loader, Lock } from 'lucide-react';
import usePlanAccess from '../hooks/usePlanAccess';

// Define types for the Web Speech API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionError extends Event {
    error: string;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult;
    length: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionError) => void;
    onstart: () => void;
    onend: () => void;
}

// Declare the global types
declare global {
    interface Window {
        SpeechRecognition?: new () => SpeechRecognition;
        webkitSpeechRecognition?: new () => SpeechRecognition;
    }
}

const VoiceCallWithAI = () => {
    const navigate = useNavigate();
    const {user} = useSelector((state: RootState) => state.auth);
    const userId = user?.uid;
    const { canAccess, getUpgradeMessage } = usePlanAccess();

    // UI States
    const [isMicOn, setIsMicOn] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('Ready to start');
    const [aiResponse, setAIResponse] = useState('');
    const [transcribedText, setTranscribedText] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationIdRef = useRef<number | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // API URL
    const API_URL = import.meta.env.VITE_openAIKey || 'https://consultant-bot-791977318929.us-central1.run.app';

    // Database reference
    const db = getDatabase();
    const callRef = ref(db, `calls/${userId}`);

    // Check browser support for required features
    const checkBrowserSupport = () => {
        const hasSpeechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
        const hasSpeechSynthesis = 'speechSynthesis' in window;

        if (!hasSpeechRecognition || !hasSpeechSynthesis) {
            toast.error('Your browser does not support speech recognition or synthesis');
            return false;
        }

        return true;
    };

    // Initialize component
    useEffect(() => {
        if (!userId) {
            toast.error('User ID is required');
            navigate('/');
            return;
        }

        // Check if user has access to voice feature
        if (!canAccess('canUseVoice')) {
            toast.error(getUpgradeMessage('canUseVoice'));
            navigate('/pricing');
            return;
        }

        // Check browser support
        checkBrowserSupport();

        // Initialize speech synthesis voices and keep-alive interval
        let keepAliveIntervalId: number | null = null;

        if ('speechSynthesis' in window) {
            // Load voices
            const loadVoices = () => {
                const voices = window.speechSynthesis.getVoices();
                console.log('Available voices:', voices.length);

                // Log available high-quality voices for debugging
                const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
                console.log('English voices:', englishVoices.map(v => v.name).join(', '));
            };

            // Try to load voices immediately
            loadVoices();

            // Chrome needs this event to get all voices
            window.speechSynthesis.onvoiceschanged = loadVoices;

            // Fix for Chrome speech synthesis bug
            // This keeps the speech synthesis active
            const keepAlive = () => {
                if (window.speechSynthesis.speaking) {
                    window.speechSynthesis.pause();
                    window.speechSynthesis.resume();
                }
            };

            // Keep checking every 5 seconds to prevent cutting off
            keepAliveIntervalId = window.setInterval(keepAlive, 5000);
        }

        // Clean up on unmount
        return () => {
            // Clear the keep-alive interval
            if (keepAliveIntervalId !== null) {
                clearInterval(keepAliveIntervalId);
            }

            // Stop speech recognition
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    console.log('Error stopping recognition:', e);
                }
                recognitionRef.current = null;
            }

            // Stop any ongoing speech
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }

            // Stop audio visualization
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
                animationIdRef.current = null;
            }

            // Stop audio stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }

            // Close audio context
            if (audioContextRef.current?.state !== 'closed') {
                audioContextRef.current?.close().catch(() => {});
                audioContextRef.current = null;
            }
        };
    }, [userId, navigate, checkBrowserSupport]);

    // Draw waveform visualization
    const drawWaveform = () => {
        if (!canvasRef.current || !analyserRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!ctx || !analyser) return;

            animationIdRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height;

                ctx.fillStyle = isMicOn
                    ? `rgb(${Math.floor(barHeight + 100)}, 100, 200)`
                    : 'rgb(100, 100, 100)';
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

                x += barWidth + 1;
            }
        };

        draw();
    };

    // Speak response using speech synthesis with natural voice
    const speakResponse = (text: string) => {
        if (!('speechSynthesis' in window)) return;

        // Cancel any ongoing speech
        if (isSpeaking) {
            window.speechSynthesis.cancel();
        }

        // Preprocess text to make it sound more natural
        // Add pauses with commas and periods for more natural speech rhythm
        let processedText = text
            // Add slight pauses after commas if there isn't already a space
            .replace(/,(?!\s)/g, ', ')
            // Ensure proper spacing after periods
            .replace(/\.(?!\s|$)/g, '. ')
            // Replace technical terms with more natural speech
            .replace(/API/g, 'A P I')
            .replace(/UI/g, 'U I')
            .replace(/URL/g, 'U R L')
            // Add pauses after colons
            .replace(/:/g, ': ')
            // Make numbers more speech-friendly
            .replace(/\d+/g, (match) => match.split('').join(' '));

        // Break text into smaller chunks for better reliability
        // This helps with longer responses that might get cut off
        const MAX_CHUNK_LENGTH = 100; // Shorter chunks for better flow
        const chunks: string[] = [];

        // Split by sentences or punctuation for more natural pauses
        const sentences = processedText.split(/(?<=[.!?])\s+/);
        let currentChunk = '';

        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length < MAX_CHUNK_LENGTH) {
                currentChunk += (currentChunk ? ' ' : '') + sentence;
            } else {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = sentence;
            }
        }

        if (currentChunk) chunks.push(currentChunk);

        // If no chunks (empty text), return
        if (chunks.length === 0) return;

        console.log('Speaking text in', chunks.length, 'chunks');

        // Speak the first chunk
        const speakChunk = (index = 0) => {
            if (index >= chunks.length) return;

            const chunk = chunks[index];
            const utterance = new SpeechSynthesisUtterance(chunk);

            // Adjust rate for more natural conversation speed
            utterance.rate = 0.9;  // Slightly slower for better comprehension
            utterance.pitch = 1.0; // Natural pitch
            utterance.volume = 1.0;

            // Try to find the most natural-sounding voice
            const voices = window.speechSynthesis.getVoices();

            // Prioritize high-quality voices in this order
            const voicePriorities = [
                // Google's neural voices are very natural
                'Google UK English Female',
                'Google US English Female',
                'Google US English',
                'Microsoft Zira',
                'Microsoft David',
                'Microsoft Mark',
                'Microsoft Jessa',
                'Samantha',  // iOS high quality voice
                'Karen',     // Australian English
                'Moira',     // Irish English
                'Tessa'      // South African English
            ];

            // Try to find a voice from our priority list
            let selectedVoice = null;
            for (const voiceName of voicePriorities) {
                const voice = voices.find(v => v.name.includes(voiceName));
                if (voice) {
                    selectedVoice = voice;
                    break;
                }
            }

            // If no priority voice found, fall back to any English female voice
            if (!selectedVoice) {
                selectedVoice = voices.find(voice =>
                    voice.lang.startsWith('en') &&
                    (voice.name.includes('Female') ||
                     voice.name.includes('Samantha') ||
                     voice.name.includes('Karen'))
                );
            }

            // Last resort: any English voice
            if (!selectedVoice) {
                selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
            }

            if (selectedVoice) {
                utterance.voice = selectedVoice;
                console.log('Using voice:', selectedVoice.name);
            }

            // First chunk
            if (index === 0) {
                utterance.onstart = () => {
                    setIsSpeaking(true);
                    console.log('Started speaking chunk', index + 1, 'of', chunks.length);
                };
            }

            // Last chunk
            if (index === chunks.length - 1) {
                utterance.onend = () => {
                    console.log('Finished speaking all chunks');
                    setIsSpeaking(false);
                    utteranceRef.current = null;
                };
            } else {
                // For middle chunks, chain to the next one with a tiny pause
                utterance.onend = () => {
                    console.log('Finished chunk', index + 1, 'of', chunks.length);
                    // Small delay between chunks for more natural speech rhythm
                    setTimeout(() => {
                        // Check if we should continue speaking (user might have interrupted)
                        if (!isMicOn) {
                            speakChunk(index + 1);
                        } else {
                            console.log('Speaking interrupted by user');
                            setIsSpeaking(false);
                            utteranceRef.current = null;
                        }
                    }, 250);
                };
            }

            utterance.onerror = (event) => {
                console.error('Speech synthesis error at chunk', index, event);
                // Try to continue with next chunk on error
                if (index < chunks.length - 1) {
                    speakChunk(index + 1);
                } else {
                    setIsSpeaking(false);
                    utteranceRef.current = null;
                    toast.error('Error speaking response');
                }
            };

            utteranceRef.current = utterance;

            // Use the Chrome fix to prevent cutting off
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            }

            window.speechSynthesis.speak(utterance);
        };

        // Start speaking the chunks
        speakChunk();
    };

    // Stop voice recognition
    const stopVoiceRecognition = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }

        if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current);
            animationIdRef.current = null;
        }

        setIsMicOn(false);
    };

    // Start voice recognition
    const startVoiceRecognition = async () => {
        if (!checkBrowserSupport()) return;

        setIsLoading(true);

        try {
            // Get microphone stream with optimal settings for mobile
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    // Higher sample rate for better quality
                    sampleRate: 48000
                }
            });
            streamRef.current = stream;

            // Setup audio visualization
            const audioCtx = new AudioContext();
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyserRef.current = analyser;
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 256;
            drawWaveform();

            // Initialize speech recognition
            const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognitionAPI) {
                throw new Error('Speech recognition not supported');
            }

            const recognition = new SpeechRecognitionAPI();
            recognition.lang = 'en-US';
            // Set continuous to false to allow for complete sentences
            recognition.continuous = false;
            recognition.interimResults = true;
            recognitionRef.current = recognition;

            // Track silence to detect end of speech
            let silenceTimeout: number | null = null;
            let lastTranscriptLength = 0;
            let finalTranscript = '';

            recognition.onstart = () => {
                setStatus('Listening... (speak now)');
                setIsMicOn(true);
                setIsLoading(false);
                finalTranscript = '';
                lastTranscriptLength = 0;
            };

            recognition.onresult = (event) => {
                // Get the latest result
                const transcript = event.results[0][0].transcript;
                const isFinal = event.results[0].isFinal;

                // Update transcription in real-time
                setTranscribedText(transcript);

                // Reset silence detection when new speech is detected
                if (transcript.length > lastTranscriptLength) {
                    lastTranscriptLength = transcript.length;

                    // Clear any existing silence timeout
                    if (silenceTimeout) {
                        clearTimeout(silenceTimeout);
                        silenceTimeout = null;
                    }

                    // Set a new silence timeout - if no new speech is detected in 1.5 seconds,
                    // consider the sentence complete
                    silenceTimeout = window.setTimeout(() => {
                        if (recognitionRef.current) {
                            recognitionRef.current.stop();
                            finalTranscript = transcript;
                        }
                    }, 1500);
                }

                // Process final result
                if (isFinal && transcript.trim().length > 0) {
                    finalTranscript = transcript;

                    // If AI is speaking, stop it
                    if (isSpeaking) {
                        window.speechSynthesis.cancel();
                        setIsSpeaking(false);
                        utteranceRef.current = null;
                    }
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);

                // Don't show errors for no-speech or aborted
                if (event.error !== 'no-speech' && event.error !== 'aborted') {
                    setStatus('Recognition error: ' + event.error);
                    setIsLoading(false);
                    toast.error('Speech recognition error: ' + event.error);
                }

                // Clear any silence timeout
                if (silenceTimeout) {
                    clearTimeout(silenceTimeout);
                    silenceTimeout = null;
                }
            };

            recognition.onend = () => {
                // Clear any silence timeout
                if (silenceTimeout) {
                    clearTimeout(silenceTimeout);
                    silenceTimeout = null;
                }

                // Process the final transcript if we have one
                if (finalTranscript && finalTranscript.trim().length > 0) {
                    processTranscription(finalTranscript);
                    return;
                }

                // If we're still supposed to be recording but didn't get a final result,
                // restart recognition to continue listening
                if (isMicOn && !isLoading) {
                    try {
                        // Small delay before restarting to avoid rapid restarts
                        setTimeout(() => {
                            if (recognitionRef.current && isMicOn) {
                                recognition.start();
                            }
                        }, 300);
                    } catch (e) {
                        console.log('Could not restart recognition:', e);
                        setIsMicOn(false);
                        setStatus('Recognition stopped');
                    }
                } else {
                    // Only show no speech message if we didn't get any text
                    if (transcribedText.trim().length === 0) {
                        setStatus('No speech detected. Try again.');
                        setIsLoading(false);
                    }
                }
            };

            // Start recognition
            recognition.start();

            // Auto-stop after 30 seconds if no final result
            // This prevents it from running forever, but gives more time to complete sentences
            setTimeout(() => {
                if (recognitionRef.current && !isLoading) {
                    recognitionRef.current.stop();
                }
            }, 30000);

        } catch (error) {
            console.error('Error starting voice recognition:', error);
            setStatus('Error starting voice recognition');
            setIsLoading(false);
            toast.error('Failed to start voice recognition');
        }
    };

    // Process transcription and get AI response
    const processTranscription = async (transcript: string) => {
        try {
            setStatus('Getting AI response...');
            setIsLoading(true);

            // Validate input
            if (!transcript || transcript.trim().length < 2) {
                setStatus('Please speak more clearly');
                setIsLoading(false);
                return;
            }

            // Call API for response
            const response = await fetch(`${API_URL}/chat/text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId || 'anonymous',
                    message: transcript.trim(),
                }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            if (data.message || data.text || data.response) {
                // Extract response from various possible formats
                const responseText = data.message || data.text || data.response;

                // Update UI
                setAIResponse(responseText);

                // Speak response if enabled
                if (isVoiceEnabled) {
                    speakResponse(responseText);
                }

                setStatus('Ready for next voice input');
            } else {
                throw new Error('Invalid response from API');
            }
        } catch (error) {
            console.error('Error processing transcription:', error);
            setStatus('Failed to get AI response');
            toast.error('Could not get AI response. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Toggle microphone
    const handleMicToggle = async () => {
        if (isMicOn) {
            // Stop recording
            stopVoiceRecognition();
            setStatus('Mic off');
            toast.info('Microphone turned off');
        } else {
            // If AI is currently speaking, interrupt it
            if (isSpeaking) {
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
                utteranceRef.current = null;
            }

            // Start recording
            await startVoiceRecognition();
            toast.success('Voice chat activated');
        }
    };

    // Toggle voice output
    const handleToggleVoice = () => {
        setIsVoiceEnabled(prev => !prev);
        // toast.info(isVoiceEnabled ? 'Voice responses disabled' : 'Voice responses enabled');
    };

    // Close the call
    const handleClose = () => {
        try {
            // Stop any ongoing speech
            if (isSpeaking) {
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
                utteranceRef.current = null;
            }

            // Stop voice recognition
            stopVoiceRecognition();

            // Clean up database reference
            remove(callRef);

            setStatus('Call ended.');
            toast.info('Call ended successfully');
            navigate(-1);
        } catch (error) {
            console.error('Error during call cleanup:', error);
            toast.error('Error while ending the call');
            navigate(-1); // Force navigation even if cleanup fails
        }
    };

    // Add a touch event handler for mobile devices
    const handleTouchStart = (event: React.TouchEvent) => {
        // Prevent default behavior to avoid scrolling
        event.preventDefault();

        // If not already recording, start recording
        if (!isMicOn && !isLoading) {
            handleMicToggle();
        }
    };

    const handleTouchEnd = (event: React.TouchEvent) => {
        // Prevent default behavior
        event.preventDefault();

        // If recording, stop recording
        if (isMicOn && !isLoading) {
            handleMicToggle();
        }
    };

    // Add a keyboard shortcut for spacebar to toggle mic
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Use spacebar to toggle microphone
            if (event.code === 'Space' && !event.repeat && !isLoading) {
                event.preventDefault();
                handleMicToggle();
            }

            // Use Escape key to end call
            if (event.code === 'Escape') {
                handleClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMicOn, isLoading, handleMicToggle, handleClose]);

    return (
        <div className="w-full h-screen bg-gradient-to-b from-indigo-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex justify-center items-center relative overflow-hidden">
            <div className="bg-white text-black dark:bg-zinc-900 rounded-xl w-full max-w-2xl mx-4 p-4 md:p-8 space-y-4 md:space-y-6 relative shadow-xl">
                <h2 className="text-2xl md:text-3xl font-semibold text-center text-indigo-700 dark:text-indigo-400">🎙️ AI Voice Assistant</h2>

                <div className="flex items-center justify-center">
                    <p className="text-base md:text-lg text-center font-medium">{status}</p>
                    {isLoading && (
                        <div className="ml-3">
                            <Loader className="h-5 w-5 animate-spin text-indigo-500" />
                        </div>
                    )}
                </div>

                {/* Speech bubbles */}
                <div className="space-y-3 min-h-[100px] max-h-[200px] overflow-y-auto">
                    {transcribedText && (
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg shadow-inner">
                            <p className="text-sm md:text-base"><span className="font-semibold text-indigo-600 dark:text-indigo-400">You:</span> {transcribedText}</p>
                        </div>
                    )}

                    {aiResponse && (
                        <div className={`bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg shadow-inner ${isSpeaking ? 'border-l-4 border-indigo-500 animate-pulse' : ''}`}>
                            <div className="flex items-start">
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400 mr-2">AI:</span>
                                <p className="text-sm md:text-base flex-1">{aiResponse}</p>
                                {isSpeaking && (
                                    <div className="flex space-x-1 ml-2 mt-1">
                                        <div className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Visualization */}
                <div className="flex justify-center">
                    <canvas ref={canvasRef} className="w-full h-16 md:h-20 rounded-lg bg-black/5 dark:bg-white/5" />
                </div>

                {/* Controls */}
                <div className="flex justify-center space-x-4 md:space-x-8 pt-2 md:pt-4">
                    {/* Main microphone button with touch support */}
                    <div className="relative group">
                        <button
                            onClick={handleMicToggle}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                            disabled={isLoading}
                            className={`p-5 md:p-6 rounded-full transition-all shadow-lg ${isMicOn
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'}
                                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                                active:scale-95 touch-manipulation`}
                            aria-label={isMicOn ? "Stop Recording" : "Start Recording"}
                        >
                            {isMicOn ? <Mic className="h-6 w-6 md:h-7 md:w-7" /> : <MicOff className="h-6 w-6 md:h-7 md:w-7" />}
                        </button>

                    </div>

                    {/* Voice toggle button */}
                    <div className="relative group">
                        <button
                            onClick={handleToggleVoice}
                            className={`p-4 rounded-full transition-all shadow-md ${isVoiceEnabled
                                ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}
                                active:scale-95 touch-manipulation`}
                            aria-label={isVoiceEnabled ? "Disable Voice Responses" : "Enable Voice Responses"}
                        >
                            {isVoiceEnabled
                                ? <Volume2 className="h-5 w-5 md:h-6 md:w-6" />
                                : <VolumeX className="h-5 w-5 md:h-6 md:w-6" />}
                        </button>
                        <div className="hidden md:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-black text-white text-xs px-2 py-1 rounded pointer-events-none">
                            {isVoiceEnabled ? "Disable Voice Responses" : "Enable Voice Responses"}
                        </div>
                    </div>

                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="p-4 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition-all shadow-md active:scale-95 touch-manipulation"
                        aria-label="End Call"
                    >
                        <X className="h-5 w-5 md:h-6 md:w-6" />
                    </button>
                </div>

                <div className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2 md:mt-4 px-2">
                    <p className="hidden md:block">Press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Space</kbd> to toggle microphone, <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Esc</kbd> to end call</p>
                    <p>Speak clearly and complete your sentences. {isSpeaking ? 'The AI is currently speaking.' : 'You can interrupt the AI at any time by tapping the mic button.'}</p>
                </div>

                {/* Mobile-specific instructions */}
                <div className="md:hidden text-xs text-center text-gray-500 dark:text-gray-400">
                    <p>Hold the mic button to speak, release when you're done speaking</p>
                </div>
            </div>
        </div>
    );
};

export default VoiceCallWithAI;
