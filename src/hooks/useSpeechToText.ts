import { useState, useRef, useEffect, useCallback } from "react";

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResultEntry {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionEventEntry {
  resultIndex: number;
  results: SpeechRecognitionResultEntry[];
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventEntry) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

const getSpeechRecognition = (): SpeechRecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as WindowWithSpeech;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

interface UseSpeechToTextOptions {
  lang?: string;
  onTranscript?: (text: string, isFinal: boolean) => void;
}

export function useSpeechToText({
  lang = "pt-BR",
  onTranscript,
}: UseSpeechToTextOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(() => getSpeechRecognition() !== null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          finalText += transcript.trim() + " ";
        } else {
          interim += transcript;
        }
      }
      if (finalText) {
        onTranscriptRef.current?.(finalText.trim(), true);
      } else if (interim) {
        onTranscriptRef.current?.(interim, false);
      }
    };

    rec.onerror = (event) => {
      const err = event?.error;
      if (err === "not-allowed" || err === "service-not-allowed") {
        setError("Permissao de microfone negada. Permita o acesso e tente novamente.");
      } else if (err === "no-speech") {
        setError("Nenhuma fala detectada. Tente falar mais perto do microfone.");
      } else {
        setError("Erro no reconhecimento de voz. Tente novamente.");
      }
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setIsSupported(false);
      setError("Reconhecimento de fala nao suportado neste navegador (use Chrome/Edge).");
      return;
    }
    if (!recognitionRef.current) return;
    setError(null);
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
    setIsListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  return { isListening, isSupported, error, start, stop, toggle };
}
