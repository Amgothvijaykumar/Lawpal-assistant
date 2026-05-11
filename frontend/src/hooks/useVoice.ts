import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

// TypeScript types for Web Speech API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
}

interface SpeechRecognitionConstructor {
    new(): SpeechRecognition;
}

declare global {
    interface Window {
        SpeechRecognition: SpeechRecognitionConstructor;
        webkitSpeechRecognition: SpeechRecognitionConstructor;
    }
}

interface UseVoiceOptions {
    language?: string;
    continuous?: boolean;
    onTranscript?: (text: string, isFinal: boolean) => void;
}

interface UseVoiceReturn {
    // Speech-to-Text (STT)
    isListening: boolean;
    transcript: string;
    startListening: () => void;
    stopListening: () => void;
    resetTranscript: () => void;
    isSpeechSupported: boolean;

    // Text-to-Speech (TTS)
    isSpeaking: boolean;
    speakText: (text: string) => Promise<void>;
    stopSpeaking: () => void;
    isTTSLoading: boolean;
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
    const { language = 'en-US', continuous = true, onTranscript } = options;

    // Speech-to-Text state
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // Text-to-Speech state
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isTTSLoading, setIsTTSLoading] = useState(false);

    // Check if Speech Recognition is supported
    const isSpeechSupported = typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    // Initialize speech recognition
    useEffect(() => {
        if (!isSpeechSupported) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();

        const recognition = recognitionRef.current;
        recognition.continuous = continuous;
        recognition.interimResults = true;
        recognition.lang = language;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            console.log('🎤 Speech recognition started');
        };

        recognition.onend = () => {
            setIsListening(false);
            console.log('🎤 Speech recognition ended');
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                } else {
                    interimTranscript += result[0].transcript;
                }
            }

            if (finalTranscript) {
                setTranscript(prev => prev + ' ' + finalTranscript.trim());
                onTranscript?.(finalTranscript.trim(), true);
            } else if (interimTranscript) {
                onTranscript?.(interimTranscript.trim(), false);
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('🎤 Speech recognition error:', event.error);
            setIsListening(false);

            if (event.error === 'not-allowed') {
                toast.error('Microphone access denied. Please allow microphone access in your browser settings.');
            } else if (event.error === 'no-speech') {
                toast.info('No speech detected. Please try again.');
            } else if (event.error !== 'aborted') {
                toast.error(`Speech recognition error: ${event.error}`);
            }
        };

        return () => {
            recognition.abort();
        };
    }, [language, continuous, isSpeechSupported, onTranscript]);

    // Start listening
    const startListening = useCallback(() => {
        if (!isSpeechSupported) {
            toast.error('Speech recognition is not supported in your browser. Try Chrome or Edge.');
            return;
        }

        setTranscript('');

        try {
            recognitionRef.current?.start();
            toast.success('🎤 Listening... Speak now');
        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            toast.error('Failed to start speech recognition');
        }
    }, [isSpeechSupported]);

    // Stop listening
    const stopListening = useCallback(() => {
        try {
            recognitionRef.current?.stop();
        } catch (error) {
            console.error('Failed to stop speech recognition:', error);
        }
    }, []);

    // Reset transcript
    const resetTranscript = useCallback(() => {
        setTranscript('');
    }, []);

    // Text-to-Speech using Browser's native SpeechSynthesis API (FREE - no API calls needed)
    const speakText = useCallback(async (text: string) => {
        if (!text.trim()) {
            toast.error('No text to speak');
            return;
        }

        // Check if SpeechSynthesis is supported
        if (!('speechSynthesis' in window)) {
            toast.error('Text-to-speech is not supported in your browser. Try Chrome or Edge.');
            return;
        }

        // Stop any currently playing speech
        window.speechSynthesis.cancel();

        setIsTTSLoading(true);

        try {
            // Clean the text - remove markdown formatting for better TTS
            const cleanText = text
                .replace(/```[\s\S]*?```/g, '') // Remove code blocks
                .replace(/`[^`]*`/g, '') // Remove inline code
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
                .replace(/[#*_~]/g, '') // Remove markdown formatting
                .replace(/\n+/g, '. ') // Convert newlines to sentences
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();

            if (!cleanText) {
                toast.error('No speakable text found');
                setIsTTSLoading(false);
                return;
            }

            // Create utterance
            const utterance = new SpeechSynthesisUtterance(cleanText.substring(0, 5000)); // Limit text length

            // Configure voice settings
            utterance.rate = 1.0; // Speed (0.1 to 10)
            utterance.pitch = 1.0; // Pitch (0 to 2)
            utterance.volume = 1.0; // Volume (0 to 1)
            utterance.lang = 'en-US';

            // Try to get a good English voice
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(voice =>
                voice.lang.startsWith('en') &&
                (voice.name.includes('Google') || voice.name.includes('Microsoft') || voice.name.includes('Natural'))
            ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];

            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }

            // Event handlers
            utterance.onstart = () => {
                setIsSpeaking(true);
                setIsTTSLoading(false);
                console.log('🔊 Speech started');
            };

            utterance.onend = () => {
                setIsSpeaking(false);
                console.log('🔊 Speech ended');
            };

            utterance.onerror = (event) => {
                console.error('🔊 Speech error:', event.error);
                setIsSpeaking(false);
                setIsTTSLoading(false);
                if (event.error !== 'canceled') {
                    toast.error('Failed to speak text');
                }
            };

            // Start speaking
            window.speechSynthesis.speak(utterance);
            toast.success('🔊 Speaking...');

        } catch (error: unknown) {
            console.error('TTS Error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Text-to-speech failed';
            toast.error(errorMessage);
            setIsTTSLoading(false);
        }
    }, []);

    // Stop speaking
    const stopSpeaking = useCallback(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        setIsSpeaking(false);
        setIsTTSLoading(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            recognitionRef.current?.abort();
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    return {
        // Speech-to-Text
        isListening,
        transcript,
        startListening,
        stopListening,
        resetTranscript,
        isSpeechSupported,

        // Text-to-Speech
        isSpeaking,
        speakText,
        stopSpeaking,
        isTTSLoading
    };
}
