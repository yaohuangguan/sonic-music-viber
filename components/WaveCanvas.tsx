import React, { useRef, useEffect } from 'react';
import { AudioVisualizerData, MOOD_PALETTES, VisualState, VisualizerStyle } from '../types';

interface WaveCanvasProps {
  data: AudioVisualizerData | null;
  visualState: VisualState;
  activeStyle: VisualizerStyle;
}

class Particle {
    x: number;
    y: number;
    size: number;
    baseSize: number;
    speedX: number;
    speedY: number;
    color: string;
    opacity: number;
    
    constructor(w: number, h: number, colors: string[]) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.baseSize = Math.random() * 2 + 1; // Bigger particles
        this.size = this.baseSize;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = (Math.random() - 0.5) * 0.4;
        this.color = colors[Math.floor(Math.random() * 3)];
        this.opacity = Math.random() * 0.5 + 0.2;
    }

    update(w: number, h: number, energy: number, isHigh: boolean) {
        // Particles move faster with energy
        const speedMult = isHigh ? 12 : 2 + (energy * 5);
        
        this.x += this.speedX * speedMult;
        this.y += this.speedY * speedMult;

        // Pulse size with beat - exaggerate this
        this.size = this.baseSize + (energy * 5);

        if (this.x < 0) this.x = w;
        if (this.x > w) this.x = 0;
        if (this.y < 0) this.y = h;
        if (this.y > h) this.y = 0;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.opacity;
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

const WaveCanvas: React.FC<WaveCanvasProps> = ({ data, visualState, activeStyle }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      const energy = visualState.energyLevel; 
      const isHigh = visualState.isHighEnergy;
      const palette = MOOD_PALETTES[visualState.palette];
      
      const colorGlow = palette[0];   
      const colorBars = palette[1];   
      const colorCore = palette[2];   
      
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'screen';

      const speedMultiplier = isHigh ? 0.08 : 0.02;
      timeRef.current += speedMultiplier + (energy * 0.03);

      // --- Background Particles ---
      if (particlesRef.current.length < 80) { // More particles
           particlesRef.current.push(new Particle(w, h, [colorGlow, colorBars, colorCore]));
      }
      
      // Randomly re-color particles
      if (Math.random() < 0.1) {
          particlesRef.current.forEach(p => {
              if (Math.random() < 0.1) {
                p.color = [colorGlow, colorBars, colorCore][Math.floor(Math.random()*3)];
              }
          });
      }

      particlesRef.current.forEach(p => {
          p.update(w, h, energy, isHigh);
          p.draw(ctx);
      });

      if (data) {
        if (activeStyle === 'orb') {
            // --- RADIAL SPECTRUM ORB (DJ STYLE) ---
            
            // Increased Base Size
            const radiusBase = Math.min(w, h) * 0.22; 
            
            // Massive Bass Pulse: (0-1) * 80px expansion
            const radius = radiusBase + (data.bass / 255) * 80;
            
            ctx.translate(cx, cy);
            
            // 1. Inner Core
            const coreGradient = ctx.createRadialGradient(0,0,0,0,0, radius);
            coreGradient.addColorStop(0, colorGlow); 
            coreGradient.addColorStop(0.7, colorCore);
            coreGradient.addColorStop(1, 'transparent');
            
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fillStyle = coreGradient;
            ctx.globalAlpha = 0.8 + (energy * 0.2);
            ctx.fill();
            ctx.globalAlpha = 1.0;

            // 2. Radial Frequency Bars
            const barCount = 120;
            const angleStep = (Math.PI * 2) / barCount;
            
            // Reduced Rotation Speed (0.8 -> 0.15) for a slower, more hypnotic effect
            ctx.rotate(timeRef.current * 0.15); 

            for (let i = 0; i < barCount; i++) {
                let freqIndex;
                if (i < barCount / 2) {
                    freqIndex = i; 
                } else {
                    freqIndex = barCount - i;
                }
                
                const dataIndex = Math.floor((freqIndex / (barCount/2)) * 100); 
                const val = data.frequencyData[dataIndex] || 0;
                
                // Increased Bar Height Multiplier
                let barHeight = (val / 255) * (Math.min(w,h) * 0.35);
                
                // Huge spike on drops
                if (isHigh) barHeight *= 1.8; 

                const angle = i * angleStep;
                
                ctx.save();
                ctx.rotate(angle);
                
                ctx.beginPath();
                ctx.fillStyle = val > 230 ? '#FFFFFF' : (i % 2 === 0 ? colorGlow : colorBars);
                
                if (val > 150) {
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = ctx.fillStyle;
                } else {
                    ctx.shadowBlur = 0;
                }

                const barW = 5;
                // Offset bars slightly from core
                ctx.roundRect(radius + 8, -barW/2, barHeight, barW, 3);
                ctx.fill();
                
                ctx.restore();
            }

            // 3. Outer Ring
            if (isHigh) {
                ctx.beginPath();
                ctx.strokeStyle = colorGlow;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.6;
                // Pulse outer ring
                const outerR = radius + (Math.min(w,h)*0.35) + (energy * 30);
                ctx.arc(0, 0, outerR, 0, Math.PI*2);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }

            ctx.setTransform(1, 0, 0, 1, 0, 0);

        } else if (activeStyle === 'bars') {
             // --- DIGITAL EQ BARS ---
             const barWidth = w / 64;
             const spacer = 4;
             
             for(let i=0; i<64; i++) {
                 const hPerc = data.frequencyData[i*2] / 255;
                 // Taller bars
                 const barH = hPerc * h * 0.8;
                 
                 const x = i * barWidth;
                 const y = (h - barH) / 2;
                 
                 const grad = ctx.createLinearGradient(x, y, x, y + barH);
                 grad.addColorStop(0, colorBars);
                 grad.addColorStop(0.5, colorGlow);
                 grad.addColorStop(1, colorBars);
                 
                 ctx.fillStyle = grad;
                 ctx.shadowBlur = hPerc > 0.7 ? 25 : 0;
                 ctx.shadowColor = colorGlow;
                 
                 ctx.fillRect(x + spacer, y, barWidth - spacer*2, barH);
             }

        } else if (activeStyle === 'wave') {
             // --- NEON STRING ---
             ctx.beginPath();
             // Thicker line
             ctx.lineWidth = isHigh ? 8 : 4;
             ctx.strokeStyle = colorGlow;
             ctx.shadowBlur = 20;
             ctx.shadowColor = colorGlow;
             
             const sliceWidth = w / data.waveData.length;
             let x = 0;
             
             for(let i=0; i<data.waveData.length; i+=5) { 
                 const v = data.waveData[i] / 128.0;
                 // Bigger amplitude calculation
                 const amplitude = 100 * (1 + energy * 2);
                 const y = (v * h/2) + (Math.sin(i * 0.02 + timeRef.current) * amplitude);
                 
                 if(i===0) ctx.moveTo(x, y);
                 else ctx.lineTo(x, y);
                 x += sliceWidth * 5;
             }
             ctx.stroke();
             
             // Mirror
             ctx.globalAlpha = 0.3;
             ctx.save();
             ctx.scale(1, -1);
             ctx.translate(0, -h);
             ctx.stroke(); 
             ctx.restore();
             ctx.globalAlpha = 1.0;

        } else if (activeStyle === 'spiral') {
             // --- HYPER TUNNEL ---
             ctx.translate(cx, cy);
             const rings = 18; // More rings
             
             for(let i=0; i<rings; i++) {
                 const z = (timeRef.current * 3 + i) % rings; // Faster movement
                 const scale = Math.pow(z/rings, 3) * (Math.max(w,h) * 0.9);
                 const opacity = z/rings;
                 
                 ctx.beginPath();
                 ctx.lineWidth = 3 + (z/rings)*6;
                 ctx.strokeStyle = i%2===0 ? colorGlow : colorBars;
                 ctx.globalAlpha = opacity;
                 
                 // Stronger distortion on bass
                 const distortion = 1 + (data.bass/255 * 0.5 * (i%3===0 ? 1 : 0));
                 
                 ctx.ellipse(0, 0, scale * distortion, scale, timeRef.current * (i%2===0?1:-1), 0, Math.PI*2);
                 ctx.stroke();
             }
             ctx.globalAlpha = 1.0;
             ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
      }

      ctx.globalCompositeOperation = 'source-over';
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [data, visualState, activeStyle]);

  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-10 block" />;
};

export default WaveCanvas;