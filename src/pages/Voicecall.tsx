import React, { useEffect, useRef, useState } from 'react';
import { getDatabase, ref, remove } from 'firebase/database';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Mic, MicOff, X } from 'lucide-react';

const VoiceCallWithAI = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const navigate = useNavigate();
    const userId = user?.uid;
    const [isMicOn, setIsMicOn] = useState(false);
    const [status, setStatus] = useState('Idle');
    const [aiResponse, setAIResponse] = useState('');
    const [transcribedText, setTranscribedText] = useState('');

    const mediaRecorderRef = useRef<any>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);  // Use ref to hold recognition instance
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
        navigator.permissions.query({ name: 'microphone' as PermissionName }).then((res) => {
            if (res.state === 'denied') setStatus('Microphone access denied.');
            res.onchange = () => {
                if (res.state === 'denied') setStatus('Microphone access denied.');
            };
        }).catch((error) => {
            console.error('Error checking microphone permissions:', error);
            setStatus('Error checking microphone permissions');
        });
    }, []);

    const drawWaveform = () => {
        if (!canvasRef.current || !analyserRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const analyser = analyserRef.current;

        if (!ctx || !analyser) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationIdRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = 8; // Width of each bar
            const gap = 2; // Space between bars
            const totalBarWidth = barWidth + gap;
            const visibleBars = Math.floor(canvas.width / totalBarWidth);

            for (let i = 0; i < visibleBars; i++) {
                const value = dataArray[i];
                const barHeight = (value / 255) * canvas.height;
                const x = i * totalBarWidth;
                const y = canvas.height - barHeight;

                const hue = (i / visibleBars) * 360;
                ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
                ctx.fillRect(x, y, barWidth, barHeight);
            }
        };

        draw();
    };

    const getAIResponse = async (text: string) => {
        // Cancel any ongoing speech before making a new API call
        speechSynthesis.cancel();
        
        try {
            const aiResponse = await fetch(`${import.meta.env.VITE_openAIKey}/chat/text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    message: text,
                }),
            });

            const aiData = await aiResponse.json();
            return aiData.message; // Assuming the response has a 'message' field
        } catch (error) {
            console.error("Error in getting AI response:", error);
            return 'Error fetching AI response';
        }
    };

    const speakResponse = (responseText: string) => {
        const utterance = new SpeechSynthesisUtterance(responseText);
        speechSynthesis.speak(utterance);
    };

    const startSpeechRecognition = () => {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
            setStatus('Listening...');
        };

        recognition.onresult = async (event) => {
            const lastResult = event.results[event.resultIndex];
            const transcript = lastResult[0].transcript;
            const isFinal = lastResult.isFinal;

            setTranscribedText(transcript);

            // Only call the AI API if the result is final (not interim)
            if (isFinal) {
                const response = await getAIResponse(transcript);
                setAIResponse(response);
                speakResponse(response);  // AI speaks the response
            }
        };

        recognition.onerror = (error) => {
            console.error('Speech recognition error:', error);
            setStatus('Error in speech recognition');
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const stopSpeechRecognition = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setStatus('Mic off');
            setIsMicOn(false);
            recognitionRef.current = null;
        }
    };

    const handleMicToggle = async () => {
        if (isMicOn) {
            stopSpeechRecognition();  // Stop the current recognition session
        } else {
            try {
                // Start fresh microphone stream
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;

                const audioCtx = new AudioContext();
                audioContextRef.current = audioCtx;
                const analyser = audioCtx.createAnalyser();
                analyserRef.current = analyser;
                const source = audioCtx.createMediaStreamSource(stream);
                source.connect(analyser);

                analyser.fftSize = 64;
                drawWaveform();

                setIsMicOn(true);
                setStatus('Listening...');
                startSpeechRecognition();  // Start speech recognition immediately
            } catch (err) {
                setStatus('Mic access denied.');
            }
        }
    };

    const handleClose = () => {
        // Stop recognition and any ongoing AI voice
        stopSpeechRecognition();
        speechSynthesis.cancel();
        setStatus('Call ended.');
        setIsMicOn(false);
        remove(callRef);
        navigate(-1);  // Navigate back to previous page or home
    };

    return (
        <div className="w-full h-screen bg-gradient-to-r flex justify-center items-center relative">
            <div className="bg-white text-black dark:bg-zinc-900 rounded-xl w-full max-w-2xl p-8 space-y-6 relative">
                <h2 className="text-3xl font-semibold text-center">🎙️ AI Voice Call</h2>
                <p className="text-lg text-center">{status}</p>
                {/* {aiResponse && <p className="text-lg text-center">{aiResponse}</p>} */}
                {transcribedText && <p className="text-lg text-center">Transcribed: {transcribedText}</p>}

                <div className="flex justify-center">
                    <canvas ref={canvasRef} className="w-1/2 h-20" />
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
