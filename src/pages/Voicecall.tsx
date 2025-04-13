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
         // Cancel any ongoing speech before making a new API call
         speechSynthesis.cancel();

         try {
            console.log("Fetching AI response for:",);
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
        const cleanedText = responseText.replace(/[*#@&^%$!()_+={}\[\]|\\:;"'<>,.?/~`]/g, ''); // remove symbols
        const utterance = new SpeechSynthesisUtterance(cleanedText);
        speechSynthesis.speak(utterance);
    };
    

     const startSpeechRecognition = () => {
         try {
             // Use webkit prefix for mobile Safari
             const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
             const recognition = new SpeechRecognition();
             
             // Configure for better mobile support
             recognition.lang = 'en-US';
             recognition.continuous = true;
             recognition.interimResults = true;
             recognition.maxAlternatives = 1;

             recognition.onstart = () => {
                 setStatus('Listening...');
                 console.log('Speech recognition started');
             };

             recognition.onresult = async (event) => {
                const lastResult = event.results[event.results.length - 1];
                const transcript = lastResult[0].transcript.trim();
                const isFinal = lastResult.isFinal;
            
                const filteredText = transcript.replace(/[*#@&^%$!()_+={}\[\]|\\:;"'<>,.?/~`]/g, '').trim(); // remove special characters
            
                console.log('Transcript received:', filteredText); // Debug log
                setTranscribedText(filteredText);
            
                if (isFinal && filteredText.length > 0) {
                    try {
                        const response = await getAIResponse(filteredText);
                        setAIResponse(response);
                        speakResponse(response);
                    } catch (error) {
                        console.error('Error getting AI response:', error);
                        toast.error('Failed to get AI response');
                    }
                }
            };
            

             recognition.onerror = (error) => {
                 console.error('Speech recognition error:', error);
                 setStatus(`Error: ${error.error}`);
                 toast.error(`Speech recognition error: ${error.error}`);
                 
                 // Attempt to restart recognition on some errors
                 if (error.error === 'network' || error.error === 'service-not-allowed') {
                     setTimeout(() => {
                         if (isMicOn) {
                             recognition.start();
                         }
                     }, 1000);
                 }
             };

             recognition.onend = () => {
                 console.log('Speech recognition ended');
                 // Restart if still recording
                 if (isMicOn) {
                     try {
                         recognition.start();
                     } catch (error) {
                         console.error('Error restarting recognition:', error);
                     }
                 }
             };

             recognitionRef.current = recognition;
             recognition.start();
         } catch (error) {
             console.error('Error initializing speech recognition:', error);
             toast.error('Failed to start speech recognition');
             setStatus('Failed to start speech recognition');
         }
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
         if (!browserSupported) {
             toast.error('Speech recognition is not supported in your browser');
             return;
         }

         if (isMicOn) {
             // Stop speech recognition
             stopSpeechRecognition();

             // Stop any ongoing AI speech
             if ('speechSynthesis' in window) {
                 window.speechSynthesis.cancel();
                 window.speechSynthesis.pause();
                 window.speechSynthesis.resume();
                 window.speechSynthesis.cancel();
             }
             
             // Properly close media stream
             if (streamRef.current) {
                 const tracks = streamRef.current.getTracks();
                 tracks.forEach(track => {
                     track.stop();
                     track.enabled = false;
                 });
                 streamRef.current = null;
             }

             // Close audio context
             if (audioContextRef.current?.state !== 'closed') {
                 try {
                     await audioContextRef.current?.close();
                 } catch (err) {
                     console.error('Error closing audio context:', err);
                 }
                 audioContextRef.current = null;
             }

             // Cancel any ongoing animation
             if (animationIdRef.current) {
                 cancelAnimationFrame(animationIdRef.current);
                 animationIdRef.current = null;
             }

             setIsMicOn(false);
             setStatus('Mic off');
             setTranscribedText('');
         } else {
             try {
                 // Request permissions explicitly
                 const permissions = await navigator.permissions.query({ name: 'microphone' as PermissionName });
                 
                 if (permissions.state === 'denied') {
                     toast.error('Microphone permission denied. Please enable it in your browser settings.');
                     return;
                 }

                 // Start fresh microphone stream
                 const stream = await navigator.mediaDevices.getUserMedia({ 
                     audio: {
                         echoCancellation: true,
                         noiseSuppression: true,
                         autoGainControl: true
                     } 
                 });
                 
                 streamRef.current = stream;

                 // Create audio context with mobile-friendly settings
                 const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                 audioContextRef.current = audioCtx;
                 const analyser = audioCtx.createAnalyser();
                 analyserRef.current = analyser;
                 const source = audioCtx.createMediaStreamSource(stream);
                 source.connect(analyser);

                 analyser.fftSize = 64;
                 drawBlackBall();

                 setIsMicOn(true);
                 setStatus('Listening...');
                 startSpeechRecognition();

                 // Resume audio context if suspended (required for iOS)
                 if (audioCtx.state === 'suspended') {
                     await audioCtx.resume();
                 }
             } catch (err) {
                 console.error('Microphone access error:', err);
                 setStatus('Mic access denied.');
                 toast.error('Failed to access microphone. Please check your permissions.');
             }
         }
     };

     const handleClose = async () => {
        // Stop speech recognition
        stopSpeechRecognition();
    
        // Stop speech synthesis
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    
        // Stop mic stream
        if (streamRef.current) {
            const tracks = streamRef.current.getTracks();
            tracks.forEach(track => {
                track.stop();
                track.enabled = false;
            });
            streamRef.current = null;
        }
    
        // Stop audio context
        if (audioContextRef.current?.state !== 'closed') {
            try {
                await audioContextRef.current?.close();
            } catch (err) {
                console.error('Error closing audio context:', err);
            }
            audioContextRef.current = null;
        }
    
        // Cancel waveform animation
        if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current);
            animationIdRef.current = null;
        }
    
        // Update UI and DB
        setStatus('Call ended.');
        setIsMicOn(false);
        remove(callRef);
        navigate(-1);
    };
    
     // Check browser support on component mount
     useEffect(() => {
         const checkBrowserSupport = () => {
             // Check if the browser supports the required APIs
             const hasWebkitSpeech = 'webkitSpeechRecognition' in window;
             const hasSpeechRecognition = 'SpeechRecognition' in window;
             const hasGetUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;

             if (!hasWebkitSpeech && !hasSpeechRecognition) {
                 toast.error('Speech recognition is not supported in this browser');
                 setBrowserSupported(false);
                 return false;
             }

             if (!hasGetUserMedia) {
                 toast.error('Microphone access is not supported in this browser');
                 setBrowserSupported(false);
                 return false;
             }

             return true;
         };

         checkBrowserSupport();
     }, []);

     // Add a visible error message for unsupported browsers
     if (!browserSupported) {
         return (
             <div className="w-full h-screen flex justify-center items-center">
                 <div className="bg-white text-black dark:bg-zinc-900 rounded-xl w-full max-w-2xl p-8 text-center">
                     <h2 className="text-3xl font-semibold mb-4">Browser Not Supported</h2>
                     <p className="text-lg mb-4">
                         Your browser doesn't support voice recognition. 
                         Please use Chrome, Firefox, or Safari on a supported device.
                     </p>
                     <button 
                         onClick={() => navigate(-1)} 
                         className="bg-blue-500 text-white px-4 py-2 rounded"
                     >
                         Go Back
                     </button>
                 </div>
             </div>
         );
     }

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
