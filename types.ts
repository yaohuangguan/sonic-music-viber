export type ColorPalette = 'neon' | 'cyber' | 'sunset' | 'poison' | 'ocean' | 'fire';

export type VisualizerStyle = 'wave' | 'bars' | 'orb' | 'spiral';

export type ColorMode = 'auto' | ColorPalette;

export interface VisualState {
  palette: ColorPalette;
  secondaryPalette?: ColorPalette; 
  blendRatio?: number; 
  energyLevel: number; 
  isHighEnergy: boolean; 
}

export interface TranscriptionItem {
  id: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface AudioVisualizerData {
  frequencyData: Uint8Array;
  waveData: Uint8Array;
  volume: number;      // 0-255
  bass: number;        // 0-255
  treble: number;      // 0-255
}

// [Primary (Glow), Secondary (Bars), Accent (Core), Text, BG_Gradient_1, BG_Gradient_2]
export const MOOD_PALETTES: Record<ColorPalette, string[]> = {
  neon:   ['#ff00ff', '#00ffff', '#ffffff', '#ffffff', '#240024', '#000000'], // Classic Pink/Cyan
  cyber:  ['#00ff99', '#0066ff', '#ccff00', '#ffffff', '#001a1a', '#000000'], // Acid Green/Blue
  sunset: ['#ff3366', '#ffcc00', '#ff9900', '#ffffff', '#2b0a1a', '#1a0500'], // Vaporwave Purple/Orange
  poison: ['#9900ff', '#00ff00', '#cc00ff', '#ffffff', '#1a0033', '#000000'], // Joker Purple/Green
  ocean:  ['#00ffff', '#0099ff', '#ffffff', '#ffffff', '#001133', '#000511'], // Deep Blue/Cyan
  fire:   ['#ff0000', '#ffaa00', '#ffff00', '#ffffff', '#330000', '#110000']  // Red/Gold
};