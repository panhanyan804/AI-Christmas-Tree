import React, { RefObject, useState, useRef } from 'react';
import { Hand, Palette, Music, VolumeX, Maximize, ImagePlus, Upload, X, ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react';
import { ThemeColors } from '../types';

interface UIProps {
  videoRef: RefObject<HTMLVideoElement>;
  isReady: boolean;
  isPinched: boolean;
  colors: ThemeColors;
  setColors: React.Dispatch<React.SetStateAction<ThemeColors>>;
  treeScale: number;
  setTreeScale: React.Dispatch<React.SetStateAction<number>>;
  photoScale: number;
  setPhotoScale: React.Dispatch<React.SetStateAction<number>>;
  photos: string[];
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  musicSrc: string;
  setMusicSrc: React.Dispatch<React.SetStateAction<string>>;
  musicTitle: string;
  setMusicTitle: React.Dispatch<React.SetStateAction<string>>;
}

export const UI: React.FC<UIProps> = ({ 
  videoRef, 
  isReady, 
  isPinched, 
  colors, 
  setColors,
  treeScale,
  setTreeScale,
  photoScale,
  setPhotoScale,
  photos,
  setPhotos,
  musicSrc,
  setMusicSrc,
  musicTitle,
  setMusicTitle
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    }
    setIsPlaying(!isPlaying);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos: string[] = [];
      Array.from(e.target.files).forEach(file => {
        newPhotos.push(URL.createObjectURL(file));
      });
      setPhotos(prev => [...prev, ...newPhotos]);
    }
    // Reset input
    if (e.target) e.target.value = '';
  };

  const handlePhotoReplace = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newUrl = URL.createObjectURL(e.target.files[0]);
      setPhotos(prev => {
        const next = [...prev];
        next[index] = newUrl;
        return next;
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setMusicSrc(url);
      setMusicTitle(file.name.replace(/\.[^/.]+$/, "")); // Remove extension
      // Auto play new music
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
      
      {/* Background Audio */}
      <audio 
        ref={audioRef} 
        loop 
        src={musicSrc} 
      />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-amber-400 font-serif tracking-widest drop-shadow-lg">
            Christmas Tree
          </h1>
          <p className="text-emerald-200 text-sm opacity-80 mt-1">
            Gestural Particle System
          </p>
        </div>

        {/* Top Right Controls */}
        <div className="flex flex-col gap-4 items-end pointer-events-auto">
           {/* Music Controls */}
           <div className="flex flex-col items-end gap-1">
             <div className="flex items-center gap-2">
                {/* Upload Music Button */}
                <button 
                  onClick={() => musicInputRef.current?.click()}
                  className="bg-black/40 backdrop-blur-md border border-emerald-800/50 text-emerald-100 p-2 rounded-lg hover:bg-emerald-900/40 transition-colors"
                  title="Upload Custom Music"
                >
                  <Upload size={18} />
                </button>
                <input 
                  type="file" 
                  ref={musicInputRef} 
                  accept="audio/*" 
                  className="hidden" 
                  onChange={handleMusicUpload} 
                />

                {/* Play/Pause Button */}
                <button 
                  onClick={toggleMusic}
                  className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-emerald-800/50 text-emerald-100 px-3 py-2 rounded-lg hover:bg-emerald-900/40 transition-colors"
                >
                  {isPlaying ? <Music size={18} className="text-amber-400" /> : <VolumeX size={18} />}
                  <span className="text-xs uppercase tracking-wider font-bold">
                    {isPlaying ? "Pause" : "Play"}
                  </span>
                </button>
             </div>
             
            <span className="text-[10px] text-emerald-400/70 font-mono tracking-tighter max-w-[200px] truncate">
              ♫ {musicTitle}
            </span>
           </div>

          {/* Camera Feed */}
          <div className="relative group">
            <div className={`w-32 h-24 rounded-lg overflow-hidden border-2 transition-colors duration-300 ${isPinched ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]' : 'border-emerald-800'}`}>
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover transform scale-x-[-1]"
                playsInline 
              />
              {!isReady && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-xs text-white text-center p-2">
                  Init Camera...
                </div>
              )}
            </div>
            <div className="absolute -bottom-6 right-0 text-xs text-emerald-400 font-mono">
              {isPinched ? "CLOSED: TREE" : "OPEN: SCATTER"}
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel (Collapsible) */}
      <div className={`pointer-events-auto bg-black/60 backdrop-blur-md rounded-xl border border-emerald-900/50 w-full max-w-xs self-end shadow-2xl transition-all duration-300 overflow-hidden ${isPanelExpanded ? 'max-h-[80vh] opacity-100' : 'max-h-[60px] opacity-90'}`}>
        
        {/* Panel Header / Toggle */}
        <div 
          className="p-4 flex items-center justify-between cursor-pointer bg-emerald-950/30 hover:bg-emerald-900/40 transition-colors"
          onClick={() => setIsPanelExpanded(!isPanelExpanded)}
        >
          <div className="flex items-center gap-2 text-amber-400">
             <Palette size={16} />
             <span className="text-xs tracking-widest uppercase font-bold">Tree Control</span>
          </div>
          <button className="text-emerald-400 hover:text-white transition-colors">
            {isPanelExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-4 pt-0 overflow-y-auto max-h-[calc(80vh-60px)] custom-scrollbar">
          
          <div className="space-y-3 mt-3">
            <ColorInput 
              label="Foliage" 
              value={colors.foliage} 
              onChange={(c) => setColors(prev => ({ ...prev, foliage: c }))} 
            />
            <ColorInput 
              label="Gifts (Heavy)" 
              value={colors.heavy} 
              onChange={(c) => setColors(prev => ({ ...prev, heavy: c }))} 
            />
            <ColorInput 
              label="Ornaments (Light)" 
              value={colors.light} 
              onChange={(c) => setColors(prev => ({ ...prev, light: c }))} 
            />
          </div>

          {/* Photo Section */}
          <div className="mt-4 pt-4 border-t border-emerald-900/30">
            <div className="flex justify-between items-center mb-2">
               <div className="flex items-center gap-2 text-amber-400">
                  <ImagePlus size={16} />
                  <span className="text-xs tracking-widest uppercase">Polaroids</span>
               </div>
               {photos.length > 0 && (
                  <span className="text-[10px] text-emerald-400 font-mono">{photos.length} photos</span>
               )}
            </div>
            
            <button 
              onClick={() => photoInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 bg-emerald-900/50 hover:bg-emerald-800/50 text-emerald-100 py-2 rounded-lg border border-emerald-800 transition-all text-xs uppercase font-bold mb-3"
            >
              <Upload size={14} />
              Upload Photos
            </button>
            <input 
              type="file" 
              ref={photoInputRef} 
              accept="image/*" 
              multiple 
              className="hidden" 
              onChange={handlePhotoUpload} 
            />

            {/* Photo Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-[3.5/4] group/thumb rounded-md overflow-hidden bg-white/10 border border-white/20">
                    <img src={photo} className="w-full h-full object-cover" alt="thumbnail" />
                    
                    {/* Delete Button */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                      className="absolute top-0.5 right-0.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/thumb:opacity-100 transition-opacity z-20"
                    >
                      <X size={10} />
                    </button>

                    {/* Replace Overlay */}
                    <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity cursor-pointer z-10">
                      <span className="text-[8px] text-white font-bold uppercase tracking-wide">Replace</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden"
                        onClick={(e) => (e.target as HTMLInputElement).value = ''}
                        onChange={(e) => handlePhotoReplace(index, e)} 
                      />
                    </label>
                  </div>
                ))}
              </div>
            )}
            
            {/* Photo Scale Slider */}
             <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-emerald-400 font-mono w-12">Size</span>
              <input 
                type="range" 
                min="0.5" 
                max="2.0" 
                step="0.1"
                value={photoScale}
                onChange={(e) => setPhotoScale(parseFloat(e.target.value))}
                className="w-full h-1 bg-emerald-900 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-amber-300"
              />
            </div>
          </div>

          {/* Tree Size Slider */}
          <div className="mt-4 pt-4 border-t border-emerald-900/30">
            <div className="flex items-center gap-2 mb-2 text-amber-400">
              <Maximize size={16} />
              <span className="text-xs tracking-widest uppercase">Tree Scale</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-emerald-400 font-mono">0.5x</span>
              <input 
                type="range" 
                min="0.5" 
                max="1.5" 
                step="0.05"
                value={treeScale}
                onChange={(e) => setTreeScale(parseFloat(e.target.value))}
                className="w-full h-1 bg-emerald-900 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-amber-300"
              />
              <span className="text-[10px] text-emerald-400 font-mono">1.5x</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-emerald-900/50">
            <div className="flex items-start gap-3">
              <Hand className="text-emerald-400 mt-1" size={18} />
              <p className="text-xs text-gray-300 leading-relaxed">
                <span className="text-white font-bold">Closed Fist</span>: Form Tree<br/>
                <span className="text-white font-bold">Open Hand</span>: Scatter<br/>
                <span className="text-amber-300">Move hand</span> to rotate view.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
  <div className="flex items-center justify-between group">
    <span className="text-xs text-emerald-100 group-hover:text-white transition-colors">{label}</span>
    <div className="relative">
      <input 
        type="color" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
      />
      <div 
        className="w-8 h-4 rounded border border-white/20 shadow-inner"
        style={{ backgroundColor: value }}
      />
    </div>
  </div>
);