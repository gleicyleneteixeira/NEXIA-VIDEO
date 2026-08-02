"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  Type,
  Mic,
  Maximize2,
  Minimize2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

const FONT_COLORS = ["#ffffff", "#facc15", "#4ade80"] as const;
const COUNTDOWN_OPTIONS = [3, 5, 10] as const;
const FONT_SIZE_MIN = 24;
const FONT_SIZE_MAX = 72;
const SPEED_MIN = 1;
const SPEED_MAX = 5;

export default function Teleprompter() {
  const [script, setScript] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [fontSize, setFontSize] = useState(36);
  const [isMirrored, setIsMirrored] = useState(false);
  const [countdown, setCountdown] = useState<3 | 5 | 10>(3);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fontColor, setFontColor] = useState("#ffffff");
  const [bgOpacity, setBgOpacity] = useState(90);
  const [lineSpacing, setLineSpacing] = useState(1.8);
  const [showSettings, setShowSettings] = useState(false);

  const displayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progress = displayRef.current
    ? Math.min(
        100,
        (scrollPosition /
          Math.max(1, (contentRef.current?.scrollHeight ?? 1) - (displayRef.current?.clientHeight ?? 1))) *
          100
      )
    : 0;

  const startCountdown = useCallback(() => {
    if (!script.trim()) return;
    setIsCountingDown(true);
    setCountdownValue(countdown);

    countdownTimerRef.current = setInterval(() => {
      setCountdownValue((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          setIsCountingDown(false);
          setIsPlaying(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [countdown, script]);

  const stopScrolling = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const resetScroll = useCallback(() => {
    stopScrolling();
    setScrollPosition(0);
  }, [stopScrolling]);

  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();

    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;

      const pixelsPerFrame = speed * fontSize * 0.5;
      const pixelsPerSecond = (pixelsPerFrame / (delta || 16)) * 1000;

      setScrollPosition((prev) => {
        const el = contentRef.current;
        if (!el) return prev;
        const maxScroll = el.scrollHeight - (displayRef.current?.clientHeight ?? 0);
        if (maxScroll <= 0) {
          stopScrolling();
          return prev;
        }
        const next = prev + pixelsPerSecond * (delta / 1000);
        if (next >= maxScroll) {
          stopScrolling();
          return maxScroll;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, speed, fontSize, stopScrolling]);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPosition;
    }
  }, [scrollPosition]);

  const handlePause = useCallback(() => {
    if (isCountingDown) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setIsCountingDown(false);
      setCountdownValue(0);
      return;
    }
    if (isPlaying) {
      stopScrolling();
    }
  }, [isCountingDown, isPlaying, stopScrolling]);

  const bgColor = `rgba(0, 0, 0, ${bgOpacity / 100})`;

  return (
    <div
      className={`relative flex flex-col bg-zinc-950 overflow-hidden ${
        isFullScreen ? "fixed inset-0 z-50" : "h-full w-full"
      }`}
    >
      {/* Script Editor */}
      {!isPlaying && !isCountingDown && (
        <div className="flex-1 flex flex-col p-4">
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Paste or type your script here..."
            className="flex-1 w-full resize-none bg-transparent text-white font-mono text-lg leading-relaxed outline-none placeholder:text-zinc-600"
            spellCheck={false}
          />
        </div>
      )}

      {/* Scrolling Display */}
      {(isPlaying || isCountingDown || scrollPosition > 0) && (
        <div
          ref={displayRef}
          onClick={handlePause}
          className="relative flex-1 overflow-hidden cursor-pointer select-none"
          style={{ backgroundColor: bgColor }}
        >
          {/* Mirrored wrapper */}
          <div
            ref={scrollContainerRef}
            className="absolute inset-0 overflow-y-auto"
            style={{
              transform: isMirrored ? "scaleX(-1)" : undefined,
            }}
          >
            <div
              ref={contentRef}
              className="px-8 md:px-16 lg:px-24 py-12"
              style={{
                fontSize: `${fontSize}px`,
                color: fontColor,
                lineHeight: lineSpacing,
                transform: isMirrored ? "scaleX(-1)" : undefined,
              }}
            >
              {script.split("\n").map((line, i) => (
                <p key={i} className="mb-2 whitespace-pre-wrap">
                  {line || "\u00A0"}
                </p>
              ))}
            </div>
          </div>

          {/* Center marker */}
          <div
            className="absolute left-0 right-0 h-[2px] pointer-events-none"
            style={{
              top: "50%",
              background: "linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.7), transparent)",
            }}
          />

          {/* Countdown overlay */}
          {isCountingDown && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
              <span
                className="text-white font-bold animate-pulse"
                style={{ fontSize: "120px" }}
              >
                {countdownValue}
              </span>
            </div>
          )}

          {/* Tap hint */}
          {!isPlaying && !isCountingDown && scrollPosition > 0 && (
            <div className="absolute bottom-20 left-0 right-0 text-center text-zinc-400 text-sm pointer-events-none">
              Tap anywhere to resume
            </div>
          )}
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute bottom-16 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-4 z-30">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {/* Background Opacity */}
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Background</label>
              <input
                type="range"
                min={0}
                max={100}
                value={bgOpacity}
                onChange={(e) => setBgOpacity(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <span className="text-zinc-500 text-xs">{bgOpacity}%</span>
            </div>

            {/* Line Spacing */}
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Line Spacing</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={lineSpacing}
                onChange={(e) => setLineSpacing(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <span className="text-zinc-500 text-xs">{lineSpacing.toFixed(1)}</span>
            </div>

            {/* Font Color */}
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Font Color</label>
              <div className="flex gap-2 mt-1">
                {FONT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFontColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      fontColor === c ? "border-violet-500 scale-110" : "border-zinc-700"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Countdown */}
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Countdown</label>
              <div className="flex gap-1 mt-1">
                {COUNTDOWN_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCountdown(c)}
                    className={`px-3 py-1 rounded text-sm transition-all ${
                      countdown === c
                        ? "bg-violet-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {c}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="relative z-20 flex items-center gap-2 px-3 py-2 bg-zinc-900 border-t border-zinc-800">
        {/* Play / Reset */}
        {(isPlaying || isCountingDown || scrollPosition > 0) && (
          <>
            <button
              onClick={() => {
                if (isCountingDown) {
                  handlePause();
                } else if (isPlaying) {
                  stopScrolling();
                } else {
                  if (scrollPosition > 0) setIsPlaying(true);
                  else startCountdown();
                }
              }}
              className="p-2 rounded-lg hover:bg-zinc-800 text-white transition-colors"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying || isCountingDown ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              onClick={resetScroll}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors"
              title="Reset"
            >
              <RotateCcw size={18} />
            </button>
          </>
        )}

        {/* Play from start */}
        {!isPlaying && !isCountingDown && scrollPosition === 0 && (
          <button
            onClick={startCountdown}
            disabled={!script.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            <Play size={16} />
            Start
          </button>
        )}

        {/* Speed */}
        <div className="flex items-center gap-1 ml-2">
          <Mic size={14} className="text-zinc-500" />
          <span className="text-zinc-400 text-xs w-7 text-right">{speed}x</span>
          <input
            type="range"
            min={SPEED_MIN}
            max={SPEED_MAX}
            step={0.5}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-16 accent-violet-500"
            title="Scroll speed"
          />
        </div>

        {/* Font Size */}
        <div className="flex items-center gap-1">
          <Type size={14} className="text-zinc-500" />
          <button
            onClick={() => setFontSize((s) => Math.max(FONT_SIZE_MIN, s - 4))}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
          >
            <ChevronDown size={14} />
          </button>
          <span className="text-zinc-400 text-xs w-8 text-center">{fontSize}</span>
          <button
            onClick={() => setFontSize((s) => Math.min(FONT_SIZE_MAX, s + 4))}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
          >
            <ChevronUp size={14} />
          </button>
        </div>

        {/* Mirror */}
        <button
          onClick={() => setIsMirrored((m) => !m)}
          className={`p-2 rounded-lg transition-colors ${
            isMirrored ? "bg-violet-600 text-white" : "hover:bg-zinc-800 text-zinc-400"
          }`}
          title="Mirror mode"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v18" />
            <path d="M8 7l-4 5 4 5" />
            <path d="M16 7l4 5-4 5" />
          </svg>
        </button>

        {/* Fullscreen */}
        <button
          onClick={() => setIsFullScreen((f) => !f)}
          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors"
          title="Full screen"
        >
          {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>

        {/* Settings */}
        <button
          onClick={() => setShowSettings((s) => !s)}
          className={`p-2 rounded-lg transition-colors ${
            showSettings ? "bg-violet-600 text-white" : "hover:bg-zinc-800 text-zinc-400"
          }`}
          title="Settings"
        >
          <Settings size={18} />
        </button>

        {/* Progress Bar */}
        {(isPlaying || isCountingDown || scrollPosition > 0) && (
          <div className="ml-auto flex-1 max-w-xs h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-100"
              style={{
                width: `${progress}%`,
                backgroundColor: "#8b5cf6",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
