import { useEffect, useRef, useState, useCallback } from 'react';
// Removed Firebase Realtime Database imports
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Mic, MicOff, X, Settings, Globe } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { min } from 'date-fns';
import { manageCallSession } from '../utils/manageCallSession';
import { getCallSessionState } from '../utils/getCallSessionState';

interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
    webkitAudioContext?: any;
}

interface LanguageOption {
    code: string;
    name: string;
    flag: string;
    backendCode: string; // Map to your backend language codes
}

// Updated to match your backend SUPPORTED_LANGUAGES exactly
const SUPPORTED_LANGUAGES: LanguageOption[] = [
    { code: 'en-US', name: 'English (US)', flag: '🇺🇸', backendCode: 'en' },
    // { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧', backendCode: 'en' },
    // { code: 'es-ES', name: 'Spanish', flag: '🇪🇸', backendCode: 'es' },
    // { code: 'fr-FR', name: 'French', flag: '🇫🇷', backendCode: 'fr' },
    // { code: 'de-DE', name: 'German', flag: '🇩🇪', backendCode: 'de' },
    // { code: 'it-IT', name: 'Italian', flag: '🇮🇹', backendCode: 'it' },
    // { code: 'pt-BR', name: 'Portuguese', flag: '🇧🇷', backendCode: 'pt' },
    // { code: 'pt-PT', name: 'Portuguese (PT)', flag: '🇵🇹', backendCode: 'pt' },
    { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳', backendCode: 'hi' },
    // { code: 'ur-PK', name: 'Urdu', flag: '🇵🇰', backendCode: 'ur' },
    // { code: 'ar-SA', name: 'Arabic', flag: '🇸🇦', backendCode: 'ar' },
    // { code: 'zh-CN', name: 'Chinese (Simplified)', flag: '🇨🇳', backendCode: 'zh' },
    // { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵', backendCode: 'ja' },
    // { code: 'ko-KR', name: 'Korean', flag: '🇰🇷', backendCode: 'ko' },
    // { code: 'ru-RU', name: 'Russian', flag: '🇷🇺', backendCode: 'ru' },
    // { code: 'nl-NL', name: 'Dutch', flag: '🇳🇱', backendCode: 'nl' },
    // { code: 'sv-SE', name: 'Swedish', flag: '🇸🇪', backendCode: 'sv' },
    // { code: 'no-NO', name: 'Norwegian', flag: '🇳🇴', backendCode: 'no' },
    // { code: 'da-DK', name: 'Danish', flag: '🇩🇰', backendCode: 'da' },
    // { code: 'fi-FI', name: 'Finnish', flag: '🇫🇮', backendCode: 'fi' },
    // { code: 'tr-TR', name: 'Turkish', flag: '🇹🇷', backendCode: 'tr' },
    // { code: 'pl-PL', name: 'Polish', flag: '🇵🇱', backendCode: 'pl' },
    // { code: 'cs-CZ', name: 'Czech', flag: '🇨🇿', backendCode: 'cs' },
    // { code: 'uk-UA', name: 'Ukrainian', flag: '🇺🇦', backendCode: 'uk' },
    // { code: 'bg-BG', name: 'Bulgarian', flag: '🇧🇬', backendCode: 'bg' },
    // { code: 'hr-HR', name: 'Croatian', flag: '🇭🇷', backendCode: 'hr' },
    // { code: 'sr-RS', name: 'Serbian', flag: '🇷🇸', backendCode: 'sr' },
    // { code: 'sk-SK', name: 'Slovak', flag: '🇸🇰', backendCode: 'sk' },
    // { code: 'sl-SI', name: 'Slovenian', flag: '🇸🇮', backendCode: 'sl' },
    // { code: 'ro-RO', name: 'Romanian', flag: '🇷🇴', backendCode: 'ro' },
    // { code: 'hu-HU', name: 'Hungarian', flag: '🇭🇺', backendCode: 'hu' },
    // { code: 'el-GR', name: 'Greek', flag: '🇬🇷', backendCode: 'el' },
    // { code: 'he-IL', name: 'Hebrew', flag: '🇮🇱', backendCode: 'he' },
    // { code: 'th-TH', name: 'Thai', flag: '🇹🇭', backendCode: 'th' },
    // { code: 'vi-VN', name: 'Vietnamese', flag: '🇻🇳', backendCode: 'vi' },
    // { code: 'id-ID', name: 'Indonesian', flag: '🇮🇩', backendCode: 'id' },
    // { code: 'ms-MY', name: 'Malay', flag: '🇲🇾', backendCode: 'ms' },
    // { code: 'tl-PH', name: 'Tagalog', flag: '🇵🇭', backendCode: 'tl' },
    { code: 'ta-IN', name: 'Tamil', flag: '🇮🇳', backendCode: 'ta' },
    { code: 'kn-IN', name: 'Kannada', flag: '🇮🇳', backendCode: 'kn' },
    { code: 'mr-IN', name: 'Marathi', flag: '🇮🇳', backendCode: 'mr' },
    // { code: 'ne-NP', name: 'Nepali', flag: '🇳🇵', backendCode: 'ne' },
    // { code: 'sw-KE', name: 'Swahili', flag: '🇰🇪', backendCode: 'sw' },
    // { code: 'af-ZA', name: 'Afrikaans', flag: '🇿🇦', backendCode: 'af' },
    // { code: 'cy-GB', name: 'Welsh', flag: '🏴󐁧󐁢󐁷󐁬󐁳󐁿', backendCode: 'cy' },
    // { code: 'is-IS', name: 'Icelandic', flag: '🇮🇸', backendCode: 'is' },
    // { code: 'et-EE', name: 'Estonian', flag: '🇪🇪', backendCode: 'et' },
    // { code: 'lv-LV', name: 'Latvian', flag: '🇱🇻', backendCode: 'lv' },
    // { code: 'lt-LT', name: 'Lithuanian', flag: '🇱🇹', backendCode: 'lt' },
    // { code: 'mk-MK', name: 'Macedonian', flag: '🇲🇰', backendCode: 'mk' },
    // { code: 'be-BY', name: 'Belarusian', flag: '🇧🇾', backendCode: 'be' },
    // { code: 'az-AZ', name: 'Azerbaijani', flag: '🇦🇿', backendCode: 'az' },
    // { code: 'kk-KZ', name: 'Kazakh', flag: '🇰🇿', backendCode: 'kk' },
    // { code: 'hy-AM', name: 'Armenian', flag: '🇦🇲', backendCode: 'hy' },
    // { code: 'ka-GE', name: 'Georgian', flag: '🇬🇪', backendCode: 'ka' },
    // { code: 'fa-IR', name: 'Persian', flag: '🇮🇷', backendCode: 'fa' },
    // { code: 'bs-BA', name: 'Bosnian', flag: '🇧🇦', backendCode: 'bs' },
    // { code: 'ca-ES', name: 'Catalan', flag: '🇪🇸', backendCode: 'ca' },
    // { code: 'gl-ES', name: 'Galician', flag: '🇪🇸', backendCode: 'gl' },
    // { code: 'mi-NZ', name: 'Māori', flag: '🇳🇿', backendCode: 'mi' }
];

const VoiceCallWithAI = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const navigate = useNavigate();
    const userId = user?.uid;
    const [isMicOn, setIsMicOn] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(SUPPORTED_LANGUAGES[0]);
    const [showLanguageSelector, setShowLanguageSelector] = useState(false);
    const [languageSearchTerm, setLanguageSearchTerm] = useState('');
    const [serverLanguages, setServerLanguages] = useState<string[]>([]);
    const isMicOnRef = useRef(isMicOn);
    const isSpeakingRef = useRef(false);

    // Voice activity tracking with improved timing
    const voiceFrameCount = useRef(0);
    const silenceFrameCount = useRef(0);
    const hasRecentVoice = useRef(false);
    
    useEffect(() => {
        isMicOnRef.current = isMicOn;
    }, [isMicOn]);

    const [status, setStatus] = useState('🎙 Ready to connect');
    const [transcribedText, setTranscribedText] = useState('');
    const [detectedLanguage, setDetectedLanguage] = useState('');
    const [browserSupported, setBrowserSupported] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor'>('good');

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
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Improved timing constants
    const VOICE_THRESHOLD = -45;
    const SILENCE_THRESHOLD = -55;
    const MIN_RECORDING_DURATION = 1000; // 1 second minimum
    const MAX_RECORDING_DURATION = 10000; // 10 seconds maximum
    const MIN_AUDIO_SIZE = 2048;
    const SILENCE_FRAMES_TO_STOP = 15;
    const VOICE_FRAMES_TO_START = 3;
    const SILENCE_DURATION_TO_STOP = 1800; // 1.8 seconds
    const API_URL = 'ai-consultant-chatbot-371140242198.asia-south1.run.app';
    const CONNECTION_TIMEOUT = 30000; // 30 seconds

    // Removed Realtime Database setup

    // Filter languages based on search
    const filteredLanguages = SUPPORTED_LANGUAGES.filter(lang =>
        lang.name.toLowerCase().includes(languageSearchTerm.toLowerCase()) ||
        lang.code.toLowerCase().includes(languageSearchTerm.toLowerCase())
    );

    useEffect(() => {
        if (!userId) {
            navigate('/login');
            toast("Please login to access this page");
        }
    }, [userId, navigate]);

    useEffect(() => {
        // Enhanced browser support checking
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isChrome = /Chrome/i.test(navigator.userAgent);
        const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setBrowserSupported(false);
            setStatus('❌ Microphone access not supported');
            toast.error('Microphone access not supported in this browser.');
        } else if (!window.WebSocket) {
            setBrowserSupported(false);
            setStatus('❌ WebSocket not supported');
            toast.error('WebSocket not supported in this browser.');
        } else if (isMobile && isSafari) {
            setBrowserSupported(false);
            setStatus('❌ Safari not supported on mobile');
            toast.error('Voice features not supported in Safari on mobile. Please use Chrome.');
        } else if (isMobile && !isChrome) {
            toast.warn('For best experience, use Chrome browser on mobile devices.');
        }
    }, []);
    const pauseCallTimer = async () => {
  try {
    console.log('[Timer] Pausing call at:', timeLeftSecondsRef.current, 'seconds');
    
    // Stop local timers first
    timerStoppedRef.current = true;
    if (minuteIntervalRef.current) {
      clearInterval(minuteIntervalRef.current);
      minuteIntervalRef.current = null;
    }
    if (uiTimerIntervalRef.current) {
      clearInterval(uiTimerIntervalRef.current);
      uiTimerIntervalRef.current = null;
    }

    // Save to backend
    const result = await manageCallSession('pause', timeLeftSecondsRef.current);
    console.log('[Timer] Paused state saved to backend');
    // toast.success(result.message);
    
  } catch (error) {
    console.error("Error pausing timer:", error);
    toast.error(`Failed to pause call: ${error.message}`);
  }
};


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

    const drawVisualization = useCallback(() => {
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
            const radius = Math.max(40, Math.min(80, 40 + volume / 3));
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            // Enhanced color coding with connection quality
            let color = '#6B7280'; // gray-500
            let pulseIntensity = 0.1;

            if (!isConnected) {
                color = '#EF4444'; // red-500
            } else if (isProcessing) {
                color = '#8B5CF6'; // purple-500
                pulseIntensity = 0.3;
            } else if (isPlaying) {
                color = '#3B82F6'; // blue-500
                pulseIntensity = 0.4;
            } else if (isListening && hasRecentVoice.current) {
                color = '#10B981'; // green-500
                pulseIntensity = 0.5;
            } else if (isListening) {
                color = '#F59E0B'; // amber-500
                pulseIntensity = 0.2;
            }

            // Draw outer pulse ring
            const pulseRadius = radius + Math.sin(Date.now() / 200) * 10 * pulseIntensity;
            ctx.beginPath();
            ctx.arc(centerX, centerY, pulseRadius, 0, 2 * Math.PI);
            ctx.strokeStyle = color + '40'; // 25% opacity
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw main circle
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
            
            // Add language code and status
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(selectedLanguage.backendCode.toUpperCase(), centerX, centerY - 5);
            
            // Add connection quality indicator
            ctx.font = '10px Arial';
            const qualityText = connectionQuality === 'good' ? '●●●' : 
                              connectionQuality === 'fair' ? '●●○' : '●○○';
            ctx.fillText(qualityText, centerX, centerY + 15);
        };

        draw();
    }, [isListening, isPlaying, isProcessing, isConnected, selectedLanguage, connectionQuality]);

    const detectVoiceActivity = useCallback(() => {
        if (!analyserRef.current) return { hasVoice: false, volume: -100 };

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate RMS for better voice detection
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);
        const volume = rms === 0 ? -100 : 20 * Math.log10(rms / 255);

        const hasVoice = volume > VOICE_THRESHOLD;
        
        // Enhanced logging
        if (hasVoice || Math.random() < 0.02) {
            const recordingDuration = Date.now() - recordingStartTimeRef.current;
            console.log(`🎤 Vol: ${volume.toFixed(1)}dB, Voice: ${hasVoice}, Duration: ${recordingDuration}ms, Lang: ${selectedLanguage.backendCode}`);
        }
        
        return { hasVoice, volume };
    }, [selectedLanguage]);

    const playAudioSmooth = useCallback(async () => {
        if (isPlayingQueueRef.current || audioQueueRef.current.length === 0) return;

        console.log('🔊 Starting smooth audio playback...');
        isPlayingQueueRef.current = true;
        setIsPlaying(true);
        isSpeakingRef.current = true;

        try {
            while (audioQueueRef.current.length > 0) {
                const audioItem = audioQueueRef.current.shift();
                if (!audioItem) continue;

                const audioBlob = new Blob([audioItem.buffer], { type: 'audio/mpeg' });
                if (audioBlob.size < 100) continue;

                const audioUrl = URL.createObjectURL(audioBlob);
                const audioElement = new Audio(audioUrl);
                currentAudioRef.current = audioElement;
                
                audioElement.preload = 'auto';
                audioElement.volume = 0.9;

                await new Promise<void>((resolve) => {
                    let resolved = false;
                    const resolveOnce = () => {
                        if (!resolved) {
                            resolved = true;
                            URL.revokeObjectURL(audioUrl);
                            resolve();
                        }
                    };

                    audioElement.oncanplaythrough = () => {
                        audioElement.play()
                            .then(() => console.log('🔊 Audio chunk playing'))
                            .catch(resolveOnce);
                    };

                    audioElement.onended = resolveOnce;
                    audioElement.onerror = (e) => {
                        console.error('Audio playback error:', e);
                        resolveOnce();
                    };

                    setTimeout(resolveOnce, 8000); // 8 second timeout
                });

                await new Promise(resolve => setTimeout(resolve, 50)); // Small gap
            }
        } catch (error) {
            console.error('❌ Error in smooth audio playback:', error);
        } finally {
            console.log('✅ Audio playback completed');
            isPlayingQueueRef.current = false;
            setIsPlaying(false);
            isSpeakingRef.current = false;
            currentAudioRef.current = null;

            if (!isProcessing && isMicOnRef.current) {
                responseFinished();
            }
        }
    }, [isProcessing]);

    const startRecording = useCallback(() => {
        if (!streamRef.current || mediaRecorderRef.current?.state === 'recording') return;

        console.log(`🎙 Starting recording in ${selectedLanguage.name} (${selectedLanguage.backendCode})...`);
        recordingStartTimeRef.current = Date.now();
        voiceDetectedRef.current = false;
        lastVoiceTimeRef.current = 0;
        voiceFrameCount.current = 0;
        silenceFrameCount.current = 0;
        hasRecentVoice.current = false;

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 
                        'audio/webm;codecs=opus' : 
                        MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
        
        mediaRecorderRef.current = new MediaRecorder(streamRef.current, { 
            mimeType,
            audioBitsPerSecond: 48000 // Higher quality
        });
        audioChunksRef.current = [];

        // Set max recording duration
        if (maxRecordingTimerRef.current) clearTimeout(maxRecordingTimerRef.current);
        maxRecordingTimerRef.current = setTimeout(() => {
            if (mediaRecorderRef.current?.state === 'recording') {
                console.log("⏰ Max recording duration reached");
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
            setStatus(`🎤 Listening in ${selectedLanguage.name}...`);
            startVoiceDetection();
        };

        mediaRecorderRef.current.onstop = () => {
            setIsListening(false);
            if (maxRecordingTimerRef.current) {
                clearTimeout(maxRecordingTimerRef.current);
                maxRecordingTimerRef.current = null;
            }
            
            const recordingDuration = Date.now() - recordingStartTimeRef.current;
            
            if (audioChunksRef.current.length > 0 && 
                recordingDuration >= MIN_RECORDING_DURATION && 
                !isProcessing) {
                
                console.log(`📤 Sending ${recordingDuration}ms recording (${audioChunksRef.current.length} chunks)`);
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
                console.log(`⏭ Skipping - Duration: ${recordingDuration}ms`);
                restartListening();
            }
        };

        mediaRecorderRef.current.start(250); // Balanced chunk size
    }, [isProcessing, selectedLanguage]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
            console.log('🛑 Stopping recording...');
            if (silenceTimerRef.current) {
                clearInterval(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
            mediaRecorderRef.current.stop();
        }
    }, []);

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
                    setStatus(`🗣 Speaking in ${selectedLanguage.name}...`);
                }
            } else {
                silenceFrameCount.current++;
                voiceFrameCount.current = 0;
            }

            // Improved stopping logic
            const silenceDuration = Date.now() - lastVoiceTimeRef.current;
            const shouldStop = hasRecentVoice.current && 
                             silenceFrameCount.current >= SILENCE_FRAMES_TO_STOP && 
                             silenceDuration >= SILENCE_DURATION_TO_STOP &&
                             recordingDuration >= MIN_RECORDING_DURATION &&
                             !isProcessing;

            if (shouldStop) {
                console.log(`🔇 Stopping after ${silenceFrameCount.current} silence frames (${silenceDuration}ms)`);
                stopRecording();
            }
        }, 100);
    }, [isListening, isPlaying, isProcessing, detectVoiceActivity, stopRecording, selectedLanguage]);

    const restartListening = useCallback(() => {
        if (isMicOnRef.current && socketRef.current?.readyState === WebSocket.OPEN) {
            setTimeout(() => {
                startRecording();
                setStatus(`🎤 Ready (${selectedLanguage.name})...`);
            }, 300);
        }
    }, [startRecording, selectedLanguage]);

    const responseFinished = useCallback(() => {
        console.log('✅ Response finished, restarting listening...');
        setIsProcessing(false);
        audioBufferRef.current = [];
        audioQueueRef.current = [];
        restartListening();
    }, [restartListening]);

    // Language selection handler with backend integration
    const handleLanguageChange = (language: LanguageOption) => {
        console.log(`🌍 Changing language to: ${language.name} (${language.backendCode})`);
        setSelectedLanguage(language);
        setShowLanguageSelector(false);
        setLanguageSearchTerm('');
        
        // Send language change to server if connected
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                type: "language_change",
                language: language.backendCode, // Use backend language code
                language_name: language.name,
                full_locale: language.code
            }));
            
            console.log(`📡 Sent language change: ${language.backendCode}`);
        }
        
        toast.success(`Language changed to ${language.name}`);
    };

    const setupHeartbeat = useCallback(() => {
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        
        heartbeatIntervalRef.current = setInterval(() => {
            if (socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                    type: "ping",
                    timestamp: Date.now(),
                    language: selectedLanguage.backendCode
                }));
                
                // Update connection quality based on response time
                const pingStart = Date.now();
                setTimeout(() => {
                    const pingTime = Date.now() - pingStart;
                    if (pingTime < 100) setConnectionQuality('good');
                    else if (pingTime < 300) setConnectionQuality('fair');
                    else setConnectionQuality('poor');
                }, 100);
            }
        }, 30000); // Every 30 seconds
    }, [selectedLanguage]);


const minuteIntervalRef = useRef<NodeJS.Timeout | null>(null);
const uiTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
const timeLeftSecondsRef = useRef(0);
const timerStoppedRef = useRef(false);

// Timer/session states
// Deduct one minute from backend (Cloud Function)
async function deductMinuteFromDatabase() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');
    const token = await user.getIdToken();
    // Call backend Cloud Function to deduct 1 minute
    const res = await fetch(`https://us-central1-rewiree-4ff17.cloudfunctions.net/deductVoiceMinutes?token=${encodeURIComponent(token)}&minutes=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`Error: ${res.status}`);
    const result = await res.json();
    if (result.remainingMinutes < 0) {
      throw new Error('No minutes remaining');
    }
    return result;
  } catch (err) {
    console.error('Failed to deduct minute:', err);
    throw err;
  }
}
const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
const [isLoadingTimer, setIsLoadingTimer] = useState(false);

const startCallTimer = async (isResume: boolean = false) => {
  try {
    setIsLoadingTimer(true);
    
    let result;
    if (isResume) {
      // Resume existing session
      result = await manageCallSession('resume');
      timeLeftSecondsRef.current = result.resumeFromSeconds;
      console.log('[Timer] Resuming from backend:', result.resumeFromSeconds, 'seconds');
    } else {
      // Start new session
      result = await manageCallSession('start');
      timeLeftSecondsRef.current = result.remainingMinutes * 60;
      console.log('[Timer] Starting fresh with:', result.remainingMinutes, 'minutes');
    }

    setSessionStartTime(Date.now());
    timerStoppedRef.current = false;
    setIsLoadingTimer(false);
    updateTimerUI();

    // Start UI countdown
    if (uiTimerIntervalRef.current) clearInterval(uiTimerIntervalRef.current);
    uiTimerIntervalRef.current = setInterval(() => {
      if (timerStoppedRef.current) return;
      
      timeLeftSecondsRef.current--;
      updateTimerUI();

      if (timeLeftSecondsRef.current <= 0) {
        console.log('[Timer] Time exhausted, ending call');
        stopCallTimer();
        toast.error("Time exhausted, call ended");
        cleanupResources();
      }
    }, 1000);

    // Deduct minutes from backend every minute
    if (minuteIntervalRef.current) clearInterval(minuteIntervalRef.current);
    minuteIntervalRef.current = setInterval(async () => {
      if (timerStoppedRef.current) return;
      
      try {
        await deductMinuteFromDatabase();
      } catch (err) {
        console.error("Failed to deduct minute:", err);
        stopCallTimer();
        cleanupResources();
      }
    }, 60 * 1000);

    toast.success(result.message);

  } catch (error) {
    console.error("Error starting timer:", error);
    toast.error(`Failed to start call: ${error.message}`);
    setIsLoadingTimer(false);
    cleanupResources();
  }
};


const updateTimerUI = () => {
  const minutes = String(Math.floor(timeLeftSecondsRef.current / 60)).padStart(2, "0");
  const seconds = String(timeLeftSecondsRef.current % 60).padStart(2, "0");
  const timerElem = document.getElementById("callTimer");
  if (timerElem) {
    timerElem.innerText = `Time Left: ${minutes}:${seconds}`;
  }
};

const stopCallTimer = async () => {
  try {
    console.log('[Timer] Stopping call timer');
    // Capture whether the timer was already stopped/paused before we mark it stopped
    const wasAlreadyStopped = timerStoppedRef.current;
    // Mark the timer as stopped for local logic
    timerStoppedRef.current = true;

    // Clear intervals
    if (minuteIntervalRef.current) {
      clearInterval(minuteIntervalRef.current);
      minuteIntervalRef.current = null;
    }
    if (uiTimerIntervalRef.current) {
      clearInterval(uiTimerIntervalRef.current);
      uiTimerIntervalRef.current = null;
    }

    // Save final state to backend **only if this was an active session (not already paused/stopped)**
    if (!wasAlreadyStopped && sessionStartTime && timeLeftSecondsRef.current >= 0) {
      try {
        // Ensure backend has the exact paused seconds (pause first) so resume can use exact seconds
        try {
          console.log('[Timer] Persisting paused seconds before end:', timeLeftSecondsRef.current);
          await manageCallSession('pause', timeLeftSecondsRef.current);
          console.log('[Timer] Paused seconds persisted');
        } catch (pauseErr) {
          console.warn('[Timer] Failed to persist paused seconds before end, continuing to end:', pauseErr);
        }

        const result = await manageCallSession('pause', timeLeftSecondsRef.current);
        console.log('[Timer] Final state saved to backend', result?.message || '');
      } catch (err) {
        console.error('[Timer] Error saving final state to backend:', err);
      }
    } else {
      console.log('[Timer] Session already paused or previously stopped; skipping end() call to preserve paused state');
    }

    // Reset states
    setSessionStartTime(null);
    setIsLoadingTimer(false);
  } catch (error) {
    console.error("Error stopping timer:", error);
    toast.error("Failed to properly end call");
  }
};


    const handleMicToggle = async () => {
        if (!browserSupported) {
    toast.error('Voice features not supported');
    return;
  }

  if (isMicOn) {
    console.log('[Mic] Pausing call');
    await pauseCallTimer();
    cleanupResources();
    setStatus('⏸️ Call paused - Click to resume');
    return;
  }

  if (!userId) {
    toast.error('User ID is required');
    return;
  }

  if (isLoadingTimer) {
    toast.info('Loading timer state...');
    return;
  }

  try {
    setStatus('🔄 Connecting...');
    
    // Check backend state first
    const sessionState = await getCallSessionState();
    
    if (!sessionState.subscriptionActive) {
      toast.error("Subscription expired. Please renew your plan.");
      cleanupResources();
      return;
    }

    if (sessionState.voiceMinutesRemaining <= 0) {
      toast.error("No voice minutes remaining. Please upgrade your plan.");
      cleanupResources();
      return;
    }
            // Enhanced microphone access
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: { ideal: 48000 },
                    channelCount: { ideal: 1 },
                    latency: { ideal: 0.01 }
                } as MediaStreamConstraints['audio']
            };

            const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
            streamRef.current = stream;
            console.log('🎤 Microphone access granted');

            // Setup enhanced audio context
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContext({ 
                sampleRate: 48000,
                latencyHint: 'interactive' 
            });
            audioContextRef.current = audioCtx;

            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
                console.log('🔊 Audio context resumed');
            }

            const analyser = audioCtx.createAnalyser();
            analyserRef.current = analyser;
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.8;
            analyser.minDecibels = -90;
            analyser.maxDecibels = -10;

            drawVisualization();

            // Setup WebSocket with enhanced configuration
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${API_URL}/ws/voice/${encodeURIComponent(userId)}`;
            console.log('🔌 Connecting to WebSocket:', wsUrl);
            
            socketRef.current = new WebSocket(wsUrl);
            socketRef.current.binaryType = 'arraybuffer';

            // Connection timeout
            connectionTimeoutRef.current = setTimeout(() => {
                if (!isConnected) {
                    console.error('⏰ Connection timeout');
                    setStatus('❌ Connection timeout');
                    // toast.error('Connection timeout. Please try again.');
                    cleanupResources();
                }
            }, CONNECTION_TIMEOUT);

            socketRef.current.onopen = () => {
                console.log('✅ WebSocket connected');
                setStatus('🔄 Initializing...');
                
                if (connectionTimeoutRef.current) {
                    clearTimeout(connectionTimeoutRef.current);
                    connectionTimeoutRef.current = null;
                }
                
                if (socketRef.current) {
                    // Send enhanced initialization with your backend's expected format
                    socketRef.current.send(JSON.stringify({
                        tts_voice: "alloy",
                        audio_format: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'webm_opus' : 'webm',
                        language: selectedLanguage.backendCode, // Use backend code
                        response_language: selectedLanguage.backendCode,
                        locale: selectedLanguage.code, // Full locale for reference
                        force_language: true,
                        streaming_audio: true,
                        transcription_language: selectedLanguage.backendCode,
                        output_language: selectedLanguage.backendCode,
                        language_detection: false,
                        // Additional configuration
                        client_info: {
                            browser: navigator.userAgent,
                            timestamp: Date.now(),
                            supported_formats: ['webm', 'ogg', 'wav']
                        }
                    }));
                    
                    console.log(`📡 Sent initialization with language: ${selectedLanguage.backendCode}`);
                }
            };

            socketRef.current.onmessage = async (event) => {
                if (typeof event.data === 'string') {
                    const data = JSON.parse(event.data);
                    console.log('📨 Received:', data.type);
                    
                    switch (data.type) {
                        case "connected":
            setStatus(`✅ Connected! Speak in ${selectedLanguage.name}...`);
            setIsConnected(true);
            setIsMicOn(true);
            setServerLanguages(data.supported_languages || []);
            setupHeartbeat();
            startRecording();
            
            // Determine if resuming or starting fresh
            const isResume = sessionState.callStatus === "paused" && sessionState.pausedTimerSeconds;
            await startCallTimer(isResume);
            break;

                            
                        case "transcript":
                            setTranscribedText(data.text);
                            console.log('📝 Transcript:', data.text);
                            
                            // Enhanced language mismatch handling
                            if (data.detected_language && data.detected_language !== selectedLanguage.backendCode) {
                                setDetectedLanguage(data.detected_language);
                                console.warn(`⚠️ Language mismatch: detected ${data.detected_language}, expected ${selectedLanguage.backendCode}`);
                            } else {
                                setDetectedLanguage('');
                            }
                            break;
                            
                        case "processing":
                            setStatus('🤖 AI thinking...');
                            setIsProcessing(true);
                            audioBufferRef.current = [];
                            audioQueueRef.current = [];
                            break;

                        case "text_chunk":
                            console.log('📄 Text chunk received');
                            break;
                            
                        case "audio_format":
                            console.log('🔊 Audio format:', data.format);
                            break;

                        case "audio_chunk_complete":
                            if (audioBufferRef.current.length > 0) {
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

                                if (!isPlayingQueueRef.current) {
                                    playAudioSmooth();
                                }
                            }
                            break;
                            
                        case "complete":
                            console.log('✅ Response complete');
                            setIsProcessing(false);
                            
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
                            console.error('❌ Server error:', data.message);
                            setStatus(`❌ Error: ${data.message}`);
                            setIsProcessing(false);
                            toast.error(`Error: ${data.message}`);
                            
                            // Handle specific error types
                            if (data.message.includes('language')) {
                                toast.info(`Try speaking in ${selectedLanguage.name}`);
                            }
                            
                            setTimeout(() => restartListening(), 2000);
                            break;
                            
                        case "language_mismatch":
                            console.warn('🌍 Language mismatch:', data);
                            toast.warn(`Detected ${data.detected} but expected ${selectedLanguage.name}`);
                            setDetectedLanguage(data.detected);
                            break;
                            
                        case "language_changed":
                            console.log('🌍 Language changed on server:', data.language);
                            toast.success(`Server language: ${data.language_name}`);
                            break;
                            
                        case "heartbeat":
                        case "pong":
                            // Connection is alive
                            break;
                            
                        default:
                            console.log('❓ Unknown message type:', data.type);
                    }
                } else if (event.data instanceof ArrayBuffer && event.data.byteLength > 0) {
                    audioBufferRef.current.push(event.data);
                }
            };
            
            socketRef.current.onclose = (event) => {
                console.log('🔌 WebSocket closed:', event.code, event.reason);
                setStatus('🔌 Disconnected! Click mic to reconnect.');
                setIsConnected(false);
                cleanupResources();
                
                // if (event.code !== 1000) { // Not a normal closure
                //     toast.error('Connection lost. Please try again.');
                // }
            };
            
            socketRef.current.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                setStatus('❌ Connection error! Please try again.');
                toast.error('Connection failed. Please check your internet.');
                cleanupResources();
            };

        } catch (err) {
            console.error('❌ Mic access error:', err);
            toast.error('Microphone access denied. Please check permissions.');
            setStatus('❌ Microphone access error');
            cleanupResources();
        }
    };
const callTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleClose = async () => {
        console.log('[Close] Closing call, cleaning up and stopping timer');
        // If the mic is off (likely paused), avoid forcing an 'end' which can overwrite paused seconds
        if (!isMicOn) {
            console.log('[Close] Call is paused - skip stopping timer to preserve paused state');
            cleanupResources();
            setStatus('👋 Call paused.');
            navigate(-1);
            return;
        }

        // If mic is on (active), attempt to stop the timer normally
        await stopCallTimer();
        cleanupResources();
        setStatus('👋 Call ended.');
        navigate(-1);
    };
useEffect(() => {
  const checkPausedSession = async () => {
    if (!userId) return;
    
    try {
      const sessionState = await getCallSessionState();
      
      if (sessionState.callStatus === "paused" && sessionState.pausedTimerSeconds) {
        setStatus('⏸️ You have a paused call - Click mic to resume');
        // Show remaining time in paused state
        timeLeftSecondsRef.current = sessionState.pausedTimerSeconds;
        updateTimerUI();
        // toast.info("You have a paused call. Click the mic to resume.");
      }
    } catch (error) {
      console.error("Error checking paused session:", error);
    }
  };

  if (userId) {
    checkPausedSession();
  }
}, [userId]);

useEffect(() => {
    return () => {
        console.log('[Unmount] Component unmount, cleaning up and stopping timer');
        stopCallTimer();
        cleanupResources();
        };
    }, [cleanupResources]);

    return (
        <div className=" bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center relative">
            <div className="bg-white/80 backdrop-blur-lg text-black dark:bg-gray-900/80 dark:text-white rounded-2xl w-full max-w-3xl p-8 space-y-6 relative shadow-2xl border border-white/20">
                
                {/* Header */}
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        🎙 AI Voice Assistant
                    </h2>
                </div>

                            
                {/* Language Selector */}
                <div className="flex justify-center">
                    <div className="relative">
                        <button
                            onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                            className="flex items-center space-x-3 px-6 py-3 bg-white/50 dark:bg-gray-700/50 rounded-xl hover:bg-white/70 dark:hover:bg-gray-600/70 transition-all duration-200 border border-gray-200 dark:border-gray-600 shadow-lg backdrop-blur-sm"
                            disabled={isProcessing || isListening}
                        >
                            <Settings className="h-5 w-5" />
                            <span className="text-lg">{selectedLanguage.flag} {selectedLanguage.name}</span>
                            <span className="text-sm text-gray-500">({selectedLanguage.backendCode})</span>
                        </button>
                        
                        {showLanguageSelector && (
                            <div className="absolute top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border dark:border-gray-600 z-20 max-h-80 overflow-hidden">
                                {/* Search */}
                                <div className="p-3 border-b dark:border-gray-600">
                                    <input
                                        type="text"
                                        placeholder="Search languages..."
                                        value={languageSearchTerm}
                                        onChange={(e) => setLanguageSearchTerm(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                                    />
                                </div>
                                
                                {/* Language List */}
                                <div className="max-h-64 overflow-y-auto">
                                    {filteredLanguages.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => handleLanguageChange(lang)}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between group transition-colors"
                                            disabled={isProcessing || isListening}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <span className="text-lg">{lang.flag}</span>
                                                <div>
                                                    <span className="font-medium">{lang.name}</span>
                                                    <span className="text-sm text-gray-500 ml-2">({lang.backendCode})</span>
                                                </div>
                                            </div>
                                            {lang.code === selectedLanguage.code && (
                                                <span className="text-green-500 font-bold">✓</span>
                                            )}
                                            {serverLanguages.includes(lang.backendCode) && (
                                                <span className="text-blue-500 text-xs">●</span>
                                            )}
                                        </button>
                                    ))}
                                    
                                    {filteredLanguages.length === 0 && (
                                        <div className="p-4 text-center text-gray-500">
                                            No languages found
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Browser Support Warning */}
                {!browserSupported && (
                    <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-xl text-center space-y-2 border border-red-200 dark:border-red-700">
                        <div className="font-bold">⚠️ Voice features are not supported</div>
                        <div className="text-sm">
                            <p>On mobile: Use Chrome for Android</p>
                            <p>iOS Safari and some browsers don't support voice features</p>
                            <p>Please use a compatible browser for voice chat</p>
                        </div>
                    </div>
                )}

                {/* Transcription Display */}
                {transcribedText && (
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl text-center space-y-2 border border-blue-200 dark:border-blue-700">
                        <p className="text-lg">
                            <span className="font-semibold text-blue-700 dark:text-blue-300">You said:</span>
                        </p>
                        <p className="text-lg italic">"{transcribedText}"</p>
                        {detectedLanguage && (
                            <div className="flex items-center justify-center space-x-2 text-sm">
                                <span className="text-yellow-600 dark:text-yellow-400">⚠️ Detected:</span>
                                <span className="font-medium">{detectedLanguage}</span>
                                <span className="text-gray-500">Expected:</span>
                                <span className="font-medium">{selectedLanguage.backendCode}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Visualization */}
                <div className="flex justify-center">
                    <div className="relative">
                        <canvas 
                            ref={canvasRef} 
                            width={250} 
                            height={250} 
                            className="rounded-full bg-transparent drop-shadow-2xl" 
                        />
                        {/* Status overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center space-y-1">
                                {isProcessing && (
                                    <div className="animate-spin text-2xl">🤖</div>
                                )}
                                {isListening && !isProcessing && (
                                    <div className="animate-pulse text-2xl">🎤</div>
                                )}
                                {isPlaying && (
                                    <div className="animate-bounce text-2xl">🔊</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Controls */}
                <div className="flex justify-center space-x-8">
                    <div className="relative group">
                        <button 
                            onClick={handleMicToggle} 
                            className={`p-6 rounded-full transition-all duration-300 shadow-lg transform hover:scale-110 ${
                                isMicOn 
                                    ? 'bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white' 
                                    : 'bg-gradient-to-r from-gray-400 to-gray-600 hover:from-green-400 hover:to-green-600 text-white'
                            } ${!browserSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={!browserSupported}
                        >
                            {isMicOn ? 
                                <Mic className="h-8 w-8" /> : 
                                <MicOff className="h-8 w-8" />
                            }
                        </button>
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-black text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap">
                            {isMicOn ? "End Call" : "Start Voice Call"}
                        </div>
                    </div>

                    <button 
                        onClick={handleClose} 
                        className="p-6 bg-gradient-to-r from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 rounded-full transition-all duration-300 shadow-lg text-white transform hover:scale-110" 
                        aria-label="Close"
                    >
                        <X className="h-8 w-8" />
                    </button>
                </div>

                {/* Debug Info */}
                <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center space-y-1 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div>Language: <span className="font-mono">{selectedLanguage.backendCode}</span></div>
                        <div>Min Recording: {MIN_RECORDING_DURATION}ms</div>
                        <div>Max Recording: {MAX_RECORDING_DURATION}ms</div>
                        <div>Voice Threshold: {VOICE_THRESHOLD}dB</div>
                    </div>
                    <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
                        Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'} | 
                        Quality: {connectionQuality} | 
                        Server Languages: {serverLanguages.length}
                    </div>
                </div>
                            <div id='callTimer' className='absolute top-0 right-0 pr-5 pt-4'></div>

            </div>
            
            {/* Footer */}
            <div className="absolute bottom-4 w-full text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    🚀 Powered by Rewiree
                </p>
            </div>
        </div>
    );
};

export default VoiceCallWithAI;