import { useEffect, useRef, useState, useCallback } from 'react';
import { getDatabase, ref, remove } from 'firebase/database';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Mic, MicOff, X } from 'lucide-react';

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
// Voice activity tracking with faster response
    const voiceFrameCount = useRef(0);
    const silenceFrameCount = useRef(0);
    const hasRecentVoice = useRef(false);
    useEffect(() => {
        isMicOnRef.current = isMicOn;
    }, [isMicOn]);

    const [status, setStatus] = useState('Idle');
    const [transcribedText, setTranscribedText] = useState('');
    const [browserSupported, setBrowserSupported] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    // Audio handling refs
    const streamRef = useRef<MediaStream | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationIdRef = useRef<number | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const maxRecordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    
    // Enhanced audio streaming refs
    const audioBufferRef = useRef<ArrayBuffer[]>([]);
    const isPlayingQueueRef = useRef(false);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const audioQueueRef = useRef<{ buffer: ArrayBuffer; isLast: boolean }[]>([]);
    const recordingStartTimeRef = useRef<number>(0);
    const voiceDetectedRef = useRef(false);
    const lastVoiceTimeRef = useRef<number>(0);

    // Optimized constants for low delay
    const VOICE_THRESHOLD = -50; // Even more lenient for faster detection
    const SILENCE_THRESHOLD = -60; // Lower silence threshold
    const MIN_RECORDING_DURATION = 300; // Much shorter minimum
    const MAX_RECORDING_DURATION = 4000; // Much shorter maximum
    const MIN_AUDIO_SIZE = 512; // Smaller minimum size
    const SILENCE_FRAMES_TO_STOP = 8; // Fewer frames needed
    const VOICE_FRAMES_TO_START = 2; // Fewer frames to start
    const API_URL = 'ai-consultant-chatbot-371140242198.asia-south1.run.app';

    const db = getDatabase();
    const callRef = ref(db, `calls/${userId}`);

    useEffect(() => {
        if (!userId) {
            navigate('/login');
            toast("Please login to access this page");
        }
    }, [userId, navigate]);

    useEffect(() => {
        // Check for browser support
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isChrome = /Chrome/i.test(navigator.userAgent);
        const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setBrowserSupported(false);
            setStatus('Microphone access not supported');
            toast.error('Microphone access not supported in this browser.');
        } else if (!window.WebSocket) {
            setBrowserSupported(false);
            setStatus('WebSocket not supported');
            toast.error('WebSocket not supported in this browser.');
        } else if (isMobile && isSafari) {
            setBrowserSupported(false);
            setStatus('Safari not supported on mobile');
            toast.error('Voice recognition is not supported in Safari on mobile. Please use Chrome instead.');
        }
    }, []);

    // Cleanup resources
    const cleanupResources = useCallback(() => {
        console.log('Cleaning up resources...');
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(err => console.error('Error closing audio context:', err));
            audioContextRef.current = null;
        }
        
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.src = '';
            currentAudioRef.current = null;
        }
        
        if (silenceTimerRef.current) {
            clearInterval(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }

        if (maxRecordingTimerRef.current) {
            clearTimeout(maxRecordingTimerRef.current);
            maxRecordingTimerRef.current = null;
        }

        if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current);
            animationIdRef.current = null;
        }
        
        analyserRef.current = null;
        audioBufferRef.current = [];
        audioQueueRef.current = [];
        audioChunksRef.current = [];
        isPlayingQueueRef.current = false;
        voiceDetectedRef.current = false;
        voiceFrameCount.current = 0;
        silenceFrameCount.current = 0;
        hasRecentVoice.current = false;
        
        setIsListening(false);
        setIsProcessing(false);
        setIsPlaying(false);
        setIsConnected(false);
        setIsMicOn(false);
    }, []);

    const drawBlackBall = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !analyserRef.current || !canvas) return;

        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!analyserRef.current) return;
            animationIdRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);
            const volume = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const radius = 30 + volume / 5;
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.fillStyle = isListening ? 'green' : isPlaying ? 'blue' : 'black';
            ctx.fill();
        };

        draw();
    }, [isListening, isPlaying]);

    // Fast and responsive voice detection
    const detectVoiceActivity = useCallback(() => {
        if (!analyserRef.current) return { hasVoice: false, volume: -100 };

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Get average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const volume = average === 0 ? -100 : 20 * Math.log10(average / 255);

        const hasVoice = volume > VOICE_THRESHOLD;
        
        // Only log occasionally to avoid spam
        if (Math.random() < 0.1) {
            console.log(`Vol: ${volume.toFixed(1)}dB, Voice: ${hasVoice}`);
        }
        
        return { hasVoice, volume };
    }, []);

    // Smooth audio playback with proper buffering
    const playAudioSmooth = useCallback(async () => {
        if (isPlayingQueueRef.current || audioQueueRef.current.length === 0) {
            return;
        }

        console.log('Starting smooth audio playback...');
        isPlayingQueueRef.current = true;
        setIsPlaying(true);
        isSpeakingRef.current = true;

        try {
            while (audioQueueRef.current.length > 0) {
                const audioItem = audioQueueRef.current.shift();
                if (!audioItem) continue;

                // Create blob and play
                const audioBlob = new Blob([audioItem.buffer], { type: 'audio/mpeg' });
                if (audioBlob.size < 100) continue; // Skip tiny chunks

                const audioUrl = URL.createObjectURL(audioBlob);
                const audioElement = new Audio(audioUrl);
                currentAudioRef.current = audioElement;
                
                audioElement.preload = 'auto';
                audioElement.volume = 1.0;

                // Wait for audio to load and play
                await new Promise<void>((resolve, reject) => {
                    let resolved = false;

                    audioElement.oncanplaythrough = () => {
                        if (!resolved) {
                            audioElement.play().then(() => {
                                console.log('Audio chunk playing smoothly');
                            }).catch(reject);
                        }
                    };

                    audioElement.onended = () => {
                        if (!resolved) {
                            resolved = true;
                            URL.revokeObjectURL(audioUrl);
                            resolve();
                        }
                    };

                    audioElement.onerror = (error) => {
                        if (!resolved) {
                            resolved = true;
                            console.error('Audio playback error:', error);
                            URL.revokeObjectURL(audioUrl);
                            resolve(); // Continue with next chunk
                        }
                    };

                    // Timeout fallback
                    setTimeout(() => {
                        if (!resolved) {
                            resolved = true;
                            console.warn('Audio playback timeout, moving to next chunk');
                            URL.revokeObjectURL(audioUrl);
                            resolve();
                        }
                    }, 10000);
                });

                // Small gap between chunks for smoothness
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        } catch (error) {
            console.error('Error in smooth audio playback:', error);
        } finally {
            console.log('Audio playback completed');
            isPlayingQueueRef.current = false;
            setIsPlaying(false);
            isSpeakingRef.current = false;
            currentAudioRef.current = null;

            // Restart listening if not processing
            if (!isProcessing && isMicOnRef.current) {
                responseFinished();
            }
        }
    }, [isProcessing]);

    // Start recording with simplified voice detection
    const startRecording = useCallback(() => {
        if (!streamRef.current || mediaRecorderRef.current?.state === 'recording') return;

        console.log('Starting recording with simplified voice detection...');
        recordingStartTimeRef.current = Date.now();
        voiceDetectedRef.current = false;
        lastVoiceTimeRef.current = 0;
        voiceFrameCount.current = 0;
        silenceFrameCount.current = 0;

        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
        mediaRecorderRef.current = new MediaRecorder(streamRef.current, { 
            mimeType,
            audioBitsPerSecond: 16000
        });
        audioChunksRef.current = [];

        // Set max recording duration
        if (maxRecordingTimerRef.current) clearTimeout(maxRecordingTimerRef.current);
        maxRecordingTimerRef.current = setTimeout(() => {
            if (mediaRecorderRef.current?.state === 'recording') {
                console.log("Max recording duration reached, stopping recording.");
                stopRecording();
            }
        }, MAX_RECORDING_DURATION);

        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorderRef.current.onstart = () => {
            setIsListening(true);
            setStatus('🎤 Listening...');
            startVoiceDetection();
        };

        mediaRecorderRef.current.onstop = () => {
            setIsListening(false);
            if (maxRecordingTimerRef.current) {
                clearTimeout(maxRecordingTimerRef.current);
                maxRecordingTimerRef.current = null;
            }
            
            const recordingDuration = Date.now() - recordingStartTimeRef.current;
            
            // Send if we have audio chunks and reasonable duration
            if (audioChunksRef.current.length > 0 && recordingDuration >= MIN_RECORDING_DURATION && !isProcessing) {
                console.log(`📤 Sending (${recordingDuration}ms, ${audioChunksRef.current.length} chunks)`);
                setStatus('🔄 Processing...');
                setIsProcessing(true);
                
                const audioBlob = new Blob(audioChunksRef.current, { 
                    type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
                });
                
                if (audioBlob.size >= MIN_AUDIO_SIZE) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        if (socketRef.current?.readyState === WebSocket.OPEN && reader.result) {
                            socketRef.current.send(reader.result as ArrayBuffer);
                            socketRef.current.send("END_OF_AUDIO");
                        }
                    };
                    reader.readAsArrayBuffer(audioBlob);
                } else {
                    console.log('📦 Audio too small, restarting...');
                    setIsProcessing(false);
                    restartListening();
                }
            } else {
                console.log(`⏭️ Skipping - Duration: ${recordingDuration}ms`);
                restartListening();
            }
        };

        mediaRecorderRef.current.start(100); // Smaller chunks for faster response
    }, [isProcessing]);

    // Stop recording
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
            console.log('Stopping recording...');
            if (silenceTimerRef.current) {
                clearInterval(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
            mediaRecorderRef.current.stop();
        }
    }, []);

    // Fast voice detection during recording
    const startVoiceDetection = useCallback(() => {
        if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);

        silenceTimerRef.current = setInterval(() => {
            if (!isListening || isPlaying) return;

            const voiceData = detectVoiceActivity();
            const recordingDuration = Date.now() - recordingStartTimeRef.current;

            if (voiceData.hasVoice) {
                voiceFrameCount.current++;
                silenceFrameCount.current = 0;
                hasRecentVoice.current = true;
                lastVoiceTimeRef.current = Date.now();
                
                if (!voiceDetectedRef.current && voiceFrameCount.current >= VOICE_FRAMES_TO_START) {
                    voiceDetectedRef.current = true;
                    setStatus('🎤 Speaking...');
                }
            } else {
                silenceFrameCount.current++;
                voiceFrameCount.current = 0;
            }

            // Quick stop on silence after detecting voice
            if (hasRecentVoice.current && 
                silenceFrameCount.current >= SILENCE_FRAMES_TO_STOP && 
                recordingDuration >= MIN_RECORDING_DURATION &&
                !isProcessing) {
                console.log(`Quick stop after ${silenceFrameCount.current} silence frames`);
                stopRecording();
            }
        }, 50); // Faster checking for responsiveness
    }, [isListening, isPlaying, isProcessing, detectVoiceActivity, stopRecording]);

    // Restart with minimal delay
    const restartListening = useCallback(() => {
        if (isMicOnRef.current && socketRef.current?.readyState === WebSocket.OPEN) {
            setTimeout(() => {
                startRecording();
                setStatus('🎤 Ready...');
            }, 100); // Very fast restart
        }
    }, [startRecording]);

    // Response finished
    const responseFinished = useCallback(() => {
        console.log('Response finished, restarting listening...');
        setIsProcessing(false);
        audioBufferRef.current = [];
        audioQueueRef.current = [];
        restartListening();
    }, [restartListening]);

    const handleMicToggle = async () => {
        if (!browserSupported) {
            toast.error('Voice features not supported');
            return;
        }

        if (isMicOn) {
            cleanupResources();
            setStatus('Call ended');
            return;
        }

        if (!userId) {
            toast.error('User ID is required');
            return;
        }

        try {
            setStatus('Connecting...');
            
            // Get microphone access
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: { ideal: 16000 },
                    channelCount: { ideal: 1 },
                } as MediaStreamConstraints['audio']
            };

            const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
            streamRef.current = stream;

            // Setup audio context with better settings
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContext({ 
                sampleRate: 16000,
                latencyHint: 'interactive' 
            });
            audioContextRef.current = audioCtx;

            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
                console.log('Audio context resumed');
            }

            const analyser = audioCtx.createAnalyser();
            analyserRef.current = analyser;
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 512; // Smaller for better performance
            analyser.smoothingTimeConstant = 0.8; // More stable readings
            analyser.minDecibels = -90;
            analyser.maxDecibels = -10;

            drawBlackBall();

            // Setup WebSocket connection
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${API_URL}/ws/voice/${encodeURIComponent(userId)}`;
            console.log('Connecting to WebSocket:', wsUrl);
            socketRef.current = new WebSocket(wsUrl);
            socketRef.current.binaryType = 'arraybuffer';

            socketRef.current.onopen = () => {
                console.log('WebSocket connected');
                setStatus('Connected! Initializing...');
                if (socketRef.current) {
                    socketRef.current.send(JSON.stringify({
                        tts_voice: "alloy",
                        audio_format: MediaRecorder.isTypeSupported('audio/webm') ? 'webm' : 'ogg',
                        language: "en-US", // Explicitly set to US English
                        response_language: "en-US", // Force English responses
                        locale: "en-US",
                        force_english: true, // Additional flag
                        streaming_audio: true
                    }));
                }
            };

            socketRef.current.onmessage = async (event) => {
                if (typeof event.data === 'string') {
                    const data = JSON.parse(event.data);
                    console.log('Received message:', data.type);
                    
                    switch (data.type) {
                        case "connected":
                            setStatus('✅ Connected! Speak now...');
                            setIsConnected(true);
                            setIsMicOn(true);
                            startRecording();
                            break;
                            
                        case "transcript":
                            setTranscribedText(data.text);
                            break;
                            
                        case "processing":
                            setStatus('🤖 AI thinking...');
                            setIsProcessing(true);
                            audioBufferRef.current = [];
                            audioQueueRef.current = [];
                            break;

                        case "text_chunk":
                            console.log('Received text chunk:', data.text);
                            break;
                            
                        case "audio_format":
                            console.log('Audio format confirmed:', data.format);
                            break;

                        case "audio_chunk_complete":
                            console.log('Audio chunk complete, buffer size:', audioBufferRef.current.length);
                            if (audioBufferRef.current.length > 0) {
                                // Combine buffered chunks into one smooth segment
                                const combinedBuffer = new Uint8Array(
                                    audioBufferRef.current.reduce((total, chunk) => total + chunk.byteLength, 0)
                                );
                                let offset = 0;
                                for (const chunk of audioBufferRef.current) {
                                    combinedBuffer.set(new Uint8Array(chunk), offset);
                                    offset += chunk.byteLength;
                                }
                                
                                audioQueueRef.current.push({
                                    buffer: combinedBuffer.buffer,
                                    isLast: false
                                });
                                audioBufferRef.current = [];

                                // Start playing if we have enough buffered
                                if (audioQueueRef.current.length >= 1 && !isPlayingQueueRef.current) {
                                    playAudioSmooth();
                                }
                            }
                            break;
                            
                        case "complete":
                            console.log('Response complete');
                            setIsProcessing(false);
                            
                            // Mark last chunk and start playback if not already playing
                            if (audioQueueRef.current.length > 0) {
                                audioQueueRef.current[audioQueueRef.current.length - 1].isLast = true;
                            }
                            
                            if (!isPlayingQueueRef.current) {
                                if (audioQueueRef.current.length > 0) {
                                    playAudioSmooth();
                                } else {
                                    responseFinished();
                                }
                            }
                            break;
                            
                        case "error":
                            console.error('Server error:', data.message);
                            setStatus(`Error: ${data.message}`);
                            setIsProcessing(false);
                            toast.error(`Error: ${data.message}`);
                            restartListening();
                            break;
                            
                        case "heartbeat":
                            console.log('Heartbeat received');
                            break;
                    }
                } else if (event.data instanceof ArrayBuffer && event.data.byteLength > 0) {
                    // Buffer audio chunks for smooth playback
                    console.log('Buffering audio chunk:', event.data.byteLength, 'bytes');
                    audioBufferRef.current.push(event.data);
                }
            };
            
            socketRef.current.onclose = (event) => {
                console.log('WebSocket closed:', event.code, event.reason);
                setStatus('Disconnected! Click mic to reconnect.');
                cleanupResources();
            };
            
            socketRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setStatus('Connection error! Please try again.');
                toast.error('Connection failed. Please try again.');
                cleanupResources();
            };

        } catch (err) {
            console.error('Mic access error:', err);
            toast.error('Microphone access denied. Please check permissions.');
            setStatus('Microphone access error');
        }
    };

    const handleClose = async () => {
        cleanupResources();
        setStatus('Call ended.');
        remove(callRef);
        navigate(-1);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanupResources();
        };
    }, [cleanupResources]);

    return (
        <div className="w-full h-screen bg-gradient-to-r flex justify-center items-center relative">
            <div className="bg-white text-black dark:bg-zinc-900 rounded-xl w-full max-w-2xl p-8 space-y-6 relative">
                <h2 className="text-3xl font-semibold text-center">🎙️ AI Voice Call</h2>
                <p className="text-lg text-center">{status}</p>
                {transcribedText && <p className="text-lg text-center">You said: {transcribedText}</p>}

                {!browserSupported && (
                    <div className="bg-red-100 text-red-700 p-4 rounded text-center mb-4">
                        <strong>Voice features are not supported in this browser.</strong><br />
                        On mobile, only Chrome for Android is supported.<br />
                        iOS Safari and most other mobile browsers do <b>NOT</b> support voice features.<br />
                        Please use a compatible browser for voice chat features.
                    </div>
                )}

                <div className="flex justify-center">
                    <canvas ref={canvasRef} width={200} height={200} className="rounded-full bg-transparent" />
                </div>
                
                <div className="flex justify-center space-x-6">
                    <div className="relative group">
                        <button 
                            onClick={handleMicToggle} 
                            className={`p-4 rounded-full transition-all shadow-md ${
                                isMicOn 
                                    ? 'bg-green-100 hover:bg-green-200' 
                                    : 'bg-gray-100 hover:bg-green-200'
                            }`}
                            disabled={!browserSupported}
                        >
                            {isMicOn ? 
                                <Mic className="h-6 w-6 text-green-600" /> : 
                                <MicOff className="h-6 w-6 text-red-600" />
                            }
                        </button>
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-black text-white text-xs px-2 py-1 rounded">
                            {isMicOn ? "End Call" : "Start Call"}
                        </div>
                    </div>

                    <button 
                        onClick={handleClose} 
                        className="p-5 bg-gray-100 rounded-full hover:bg-red-200 transition-all shadow-md" 
                        aria-label="Close"
                    >
                        <X className="h-5 w-5 text-black" />
                    </button>
                </div>

                <div className="mt-4 text-xs text-gray-500 text-center">
                    <p>• Speak clearly and naturally in English</p>
                    <p>• System responds quickly (2-4 seconds)</p>
                    <p>• AI will only respond in English</p>
                    <p>• Voice threshold: {VOICE_THRESHOLD}dB</p>
                </div>
            </div>
            
            <div className="absolute bottom-0 w-full text-center">
                <p className="text-sm">Powered by AI Voice Tech</p>
            </div>
        </div>
    );
};

export default VoiceCallWithAI;