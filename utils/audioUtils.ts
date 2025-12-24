import { AudioVisualizerData } from '../types';

export class AudioProcessor {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode | null = null;
  dataArray: Uint8Array;
  waveArray: Uint8Array;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 44100, // Standard audio rate is fine for visuals
    });
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048; // Higher resolution for better bass detection
    this.analyser.smoothingTimeConstant = 0.85;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.waveArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  async start(stream: MediaStream) {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.source.connect(this.analyser);
  }

  getAnalysis(): AudioVisualizerData {
    this.analyser.getByteFrequencyData(this.dataArray);
    this.analyser.getByteTimeDomainData(this.waveArray);
    
    const bufferLength = this.dataArray.length;
    let sum = 0;
    
    // Calculate Bass (Low frequencies: ~20Hz - ~250Hz)
    // Bin size ~= 44100 / 2048 ~= 21.5 Hz
    // 250Hz is roughly index 12
    let bassSum = 0;
    const bassCount = 12; 
    for (let i = 0; i < bassCount; i++) {
        bassSum += this.dataArray[i];
    }
    const bass = bassSum / bassCount;

    // Calculate Treble (High frequencies: ~2kHz - 4kHz)
    // Indexes around 100-200
    let trebleSum = 0;
    const trebleStart = 100;
    const trebleEnd = 200;
    for (let i = trebleStart; i < trebleEnd; i++) {
        trebleSum += this.dataArray[i];
    }
    const treble = trebleSum / (trebleEnd - trebleStart);

    // Total Volume Average
    for (let i = 0; i < bufferLength; i++) {
        sum += this.dataArray[i];
    }
    const volume = sum / bufferLength;

    return {
      frequencyData: this.dataArray,
      waveData: this.waveArray,
      volume,
      bass,
      treble
    };
  }

  stop() {
    if (this.source) {
      this.source.disconnect();
    }
  }
}