import React, { useEffect, useRef, useState, useCallback } from 'react';
import WaveCanvas from './components/WaveCanvas';
import { AudioProcessor } from './utils/audioUtils';
import { useWebSpeech } from './hooks/useWebSpeech';
import { AudioVisualizerData, VisualizerStyle, ColorMode, ColorPalette, MOOD_PALETTES, VisualState } from './types';

const App: React.FC = () => {
  // State
  const [isListening, setIsListening] = useState(false);
  const [audioData, setAudioData] = useState<AudioVisualizerData | null>(null);
  
  // Customization State
  const [activeStyle, setActiveStyle] = useState<VisualizerStyle>('orb');
  const [colorMode, setColorMode] = useState<ColorMode>('auto');
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // Visual State (Algorithmic)
  const [visualState, setVisualState] = useState<VisualState>({
    palette: 'neon', // Default to Neon as requested
    energyLevel: 0.5,
    isHighEnergy: false,
    blendRatio: 0
  });

  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const animationFrameRef = useRef<number>(0);
  
  // Refs for auto-DJ logic
  const highEnergyCounterRef = useRef<number>(0); 
  const lastPaletteChangeRef = useRef<number>(0);
  const currentPaletteIndexRef = useRef<number>(0);
  const blendOscillatorRef = useRef<number>(0);
  const flashIntensityRef = useRef<number>(0); 
  const gradientRotationRef = useRef<number>(0);
  
  // Web Speech Hook
  const { transcripts } = useWebSpeech(isListening);

  // --- Logic: Auto DJ Mood Detection ---
  const analyzeMood = useCallback((data: AudioVisualizerData) => {
    const now = Date.now();
    // Determine Energy (0.0 - 1.0)
    const energy = (data.volume * 0.3 + data.bass * 0.7) / 255;
    
    // Detect "High Energy" (Drops / Chorus)
    const isCurrentlyHigh = energy > 0.6;
    
    if (isCurrentlyHigh) {
        highEnergyCounterRef.current += 1;
    } else {
        highEnergyCounterRef.current = Math.max(0, highEnergyCounterRef.current - 1);
    }

    const isHighState = highEnergyCounterRef.current > 10;
    blendOscillatorRef.current += 0.05 + (energy * 0.1);

    // --- STROBE / FLASH LOGIC ---
    if (data.bass > 190) {
        // Instant flash on kick
        flashIntensityRef.current = 1.0;
    } else {
        // Fast exponential decay
        flashIntensityRef.current *= 0.85; 
        if (flashIntensityRef.current < 0.01) flashIntensityRef.current = 0;
    }
    
    // Rotate background gradient slowly, speed up on energy
    gradientRotationRef.current += 0.2 + (energy * 2.0); 

    if (colorMode === 'auto') {
        let nextPalette: ColorPalette = visualState.palette;
        let secondaryPalette: ColorPalette | undefined = undefined;
        
        const palettes = Object.keys(MOOD_PALETTES) as ColorPalette[];
        const timeSinceChange = now - lastPaletteChangeRef.current;
        
        if (isHighState) {
            // Switch palette on drops
            if (timeSinceChange > 3000) { 
                currentPaletteIndexRef.current = (currentPaletteIndexRef.current + 1) % palettes.length;
                nextPalette = palettes[currentPaletteIndexRef.current];
                lastPaletteChangeRef.current = now;
            }
        } else if (energy < 0.3 && timeSinceChange > 6000) {
             // Default to Neon or Ocean if chill
             if (nextPalette !== 'neon' && nextPalette !== 'ocean') {
                 nextPalette = 'neon'; 
                 lastPaletteChangeRef.current = now;
             }
        }

        setVisualState({
            palette: nextPalette,
            secondaryPalette,
            blendRatio: flashIntensityRef.current,
            energyLevel: energy,
            isHighEnergy: isHighState
        });
    } else {
        setVisualState({
            palette: colorMode,
            energyLevel: energy,
            isHighEnergy: isHighState,
            blendRatio: flashIntensityRef.current
        });
    }
  }, [colorMode, visualState.palette]);

  // Main Audio Loop
  const updateAudioData = useCallback(() => {
    if (isListening && audioProcessorRef.current) {
      const data = audioProcessorRef.current.getAnalysis();
      setAudioData(data);
      analyzeMood(data);
    } else {
        setAudioData(null);
        setVisualState(prev => ({ ...prev, energyLevel: 0.1, isHighEnergy: false, blendRatio: 0 }));
    }
    animationFrameRef.current = requestAnimationFrame(updateAudioData);
  }, [isListening, analyzeMood]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(updateAudioData);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [updateAudioData]);

  // Start/Stop Handler
  const toggleSession = async () => {
    if (isListening) {
      setIsListening(false);
      audioProcessorRef.current?.stop();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!audioProcessorRef.current) {
          audioProcessorRef.current = new AudioProcessor();
        }
        await audioProcessorRef.current.start(stream);
        setIsListening(true);
      } catch (err) {
        console.error("Failed to get microphone", err);
        alert("Microphone permission is required.");
      }
    }
  };

  // UI Control Hiding
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    resetTimer();
    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      clearTimeout(timeout);
    };
  }, []);

  const currentPalette = MOOD_PALETTES[visualState.palette];
  const flash = visualState.blendRatio || 0; 
  
  // --- CSS LINEAR GRADIENT BACKGROUND ---
  // We use the rotation ref to spin the gradient
  const angle = gradientRotationRef.current % 360;
  
  // Swap colors on high energy beats for extra variation
  const color1 = visualState.isHighEnergy && Math.floor(Date.now() / 500) % 2 === 0 ? currentPalette[5] : currentPalette[4];
  const color2 = visualState.isHighEnergy && Math.floor(Date.now() / 500) % 2 === 0 ? currentPalette[4] : currentPalette[5];

  const bgStyle = {
      // Linear Gradient as requested
      background: `linear-gradient(${angle}deg, ${color1}, ${color2})`,
      
      // Strobe Effect: brightness + saturation boost on beat
      filter: `brightness(${100 + (flash * 50)}%) saturate(${100 + (flash * 30)}%) contrast(${100 + (flash * 10)}%)`,
      
      // Inner Glow Flash
      boxShadow: `inset 0 0 ${200 + (flash * 300)}px rgba(0,0,0,0.8)`,
      
      // No transition for filter to keep it snappy
      transition: 'background 0.2s linear' 
  };

  return (
    <>
      <style>{`
        .text-glow {
            text-shadow: 0 0 10px currentColor;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
      `}</style>
      
      <div 
        className="relative w-screen h-screen overflow-hidden"
        style={bgStyle}
      >
        {/* 1. Canvas Layer */}
        <WaveCanvas 
          data={audioData} 
          visualState={visualState} 
          activeStyle={activeStyle}
        />

        {/* 2. Transcription Overlay */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-30 flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-6xl flex flex-col items-center gap-4">
                {transcripts.length > 0 && transcripts.slice(-3, -1).map((item) => (
                    <p key={item.id} className="text-center font-bold text-2xl md:text-3xl text-white/50 blur-[1px] transition-all duration-700 transform scale-90">
                        {item.text}
                    </p>
                ))}

                {transcripts.length > 0 ? (
                    (() => {
                        const activeItem = transcripts[transcripts.length - 1];
                        return (
                            <div key={activeItem.id} className="relative mt-2">
                                <p 
                                    className={`
                                        text-center font-black text-5xl md:text-8xl tracking-tighter leading-tight
                                        transition-all duration-75 uppercase
                                        ${visualState.isHighEnergy ? 'scale-110' : 'scale-100'}
                                    `}
                                    style={{ 
                                        color: '#ffffff', 
                                        textShadow: `0 0 20px ${currentPalette[0]}, 0 0 40px ${currentPalette[1]}, 0 0 80px ${currentPalette[0]}`
                                    }}
                                >
                                    {activeItem.text}
                                </p>
                            </div>
                        );
                    })()
                ) : (
                    isListening && (
                        <p className="text-white/40 text-2xl font-bold tracking-widest uppercase animate-pulse">
                            Listening...
                        </p>
                    )
                )}
            </div>
        </div>

        {/* 3. Settings Toggle */}
        <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`absolute top-6 right-6 z-50 p-3 rounded-full bg-black/40 border border-white/10 hover:bg-white/10 backdrop-blur-md transition-all duration-300 ${showSettings ? 'rotate-90 text-white shadow-[0_0_20px_white]' : 'text-white/70'}`}
        >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
        </button>

        {/* 4. Settings Panel */}
        <div className={`absolute top-24 right-4 z-50 transition-all duration-300 ${showSettings ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
            <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-5 rounded-xl shadow-2xl w-72">
                <div className="mb-6">
                    <h4 className="text-[10px] uppercase tracking-widest text-white/40 mb-3 font-bold">Visual Style</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {(['orb', 'spiral', 'bars', 'wave'] as VisualizerStyle[]).map(style => (
                            <button 
                                key={style}
                                onClick={() => setActiveStyle(style)}
                                className={`px-3 py-3 text-xs font-bold uppercase tracking-wider rounded border transition-all ${activeStyle === style ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30'}`}
                            >
                                {style}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="text-[10px] uppercase tracking-widest text-white/40 mb-3 font-bold">Palette</h4>
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        <button 
                             onClick={() => setColorMode('auto')}
                             className={`px-4 py-3 text-xs font-bold uppercase rounded border transition-all flex justify-between items-center ${colorMode === 'auto' ? 'border-purple-500 bg-purple-500/20 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'border-white/10 hover:bg-white/5 text-gray-400'}`}
                        >
                            <span>Auto DJ Mode</span>
                            {colorMode === 'auto' && <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"/>}
                        </button>
                        {Object.keys(MOOD_PALETTES).map((mode) => (
                            <button 
                                key={mode}
                                onClick={() => setColorMode(mode as ColorPalette)}
                                className={`px-4 py-3 text-xs font-bold uppercase rounded border transition-all flex items-center gap-3 ${colorMode === mode ? 'bg-white/10 text-white border-white/50' : 'border-white/5 text-gray-500 hover:text-gray-300'}`}
                            >
                                <div className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style={{ background: MOOD_PALETTES[mode as ColorPalette][0] }}></div>
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* 5. Start Button */}
        <div className={`absolute bottom-12 left-0 right-0 flex justify-center items-center gap-6 transition-all duration-500 z-50 ${showControls || !isListening ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <button
            onClick={toggleSession}
            className={`px-10 py-5 rounded-full font-black text-xl tracking-widest uppercase transition-all hover:scale-105 active:scale-95 flex items-center gap-3
                ${isListening 
                ? 'bg-red-600/90 text-white shadow-[0_0_30px_rgba(220,38,38,0.6)] backdrop-blur-sm' 
                : 'bg-white text-black shadow-[0_0_30px_white]'
                }`}
            >
            {isListening ? 'Stop Vibe' : 'Start Vibe'}
            </button>
        </div>
      </div>
    </>
  );
};

export default App;