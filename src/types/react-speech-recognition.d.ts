declare module 'react-speech-recognition' {
  export interface SpeechRecognitionOptions {
    continuous?: boolean;
    interimResults?: boolean;
    lang?: string;
  }

  export interface SpeechRecognitionHook {
    transcript: string;
    listening: boolean;
    resetTranscript: () => void;
    browserSupportsSpeechRecognition: boolean;
  }

  export default {
    startListening: (options?: SpeechRecognitionOptions) => void,
    stopListening: () => void,
    abortListening: () => void,
    browserSupportsSpeechRecognition: boolean,
  };

  export function useSpeechRecognition(): SpeechRecognitionHook;
}
