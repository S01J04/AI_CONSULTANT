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
        }

        // Try asking for mic permission on mount
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                stream.getTracks().forEach(track => track.stop());
                console.log("Mic permission granted on load");
            })
            .catch(() => {
                console.warn("Mic permission denied on load");
            });
    }, []);

    const drawBlackBall = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !analyserRef.current) return;

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

    const getAIResponse = async (text: string) => {
        speechSynthesis.cancel();
        try {
            const res = await fetch(`${import.meta.env.VITE_openAIKey}/chat/text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, message: text }),
            });
            const data = await res.json();
            return data.message;
        } catch (err) {
            console.error('AI fetch error:', err);
            return 'Error getting response';
        }
    };

    const speakResponse = (text: string) => {
        const clean = text.replace(/[*#@&^%$!()_+={}\[\]|\\:;"'<>,.?/~`]/g, '');
        const utter = new SpeechSynthesisUtterance(clean);
        speechSynthesis.speak(utter);
    };

    const startSpeechRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => setStatus('Listening...');
        recognition.onresult = async (event: any) => {
            const lastResult = event.results[event.results.length - 1];
            const transcript = lastResult[0].transcript.trim();
            const isFinal = lastResult.isFinal;
            const filtered = transcript.replace(/[*#@&^%$!()_+={}\[\]|\\:;"'<>,.?/~`]/g, '');

            setTranscribedText(filtered);

            if (isFinal && filtered.length > 0) {
                const response = await getAIResponse(filtered);
                setAIResponse(response);
                speakResponse(response);
            }
        };

        recognition.onerror = (err: any) => {
            console.error('Recognition error:', err);
            toast.error(`Recognition error: ${err.error}`);
            setStatus('Error');
        };

        recognition.onend = () => {
            if (isMicOn) recognition.start();
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const stopSpeechRecognition = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
            setStatus('Mic off');
            setIsMicOn(false);
        }
    };

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
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = audioCtx;

            const analyser = audioCtx.createAnalyser();
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 64;

            await audioCtx.resume();
            drawBlackBall();

            setIsMicOn(true);
            setStatus('Listening...');
            startSpeechRecognition();
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
