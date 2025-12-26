import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ImageSliderProps {
  before: string;
  after: string;
  afterStyle?: React.CSSProperties;
  zoom: number;
  loading?: 'lazy' | 'eager';
}

const ImageSlider: React.FC<ImageSliderProps> = ({ before, after, afterStyle, zoom, loading }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSlider = useRef(false);
  
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (zoom <= 1) {
      setPan({ x: 0, y: 0 });
    }
  }, [zoom]);

  const handleSliderMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  }, []);

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent container's pan event
    isDraggingSlider.current = true;
    e.preventDefault();
  };
  
  const handleSliderTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    isDraggingSlider.current = true;
  };
  
  const handlePanMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    if(containerRef.current) containerRef.current.style.cursor = 'grabbing';
  };
  
  const handlePanTouchStart = (e: React.TouchEvent) => {
    if (zoom <= 1) return;
     // Only pan if not touching the slider handle
    if ((e.target as HTMLElement).dataset.role !== 'slider-handle') {
      setIsPanning(true);
      setPanStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDraggingSlider.current) {
        handleSliderMove(e.clientX);
      }
      if (isPanning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      }
    };
    
    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDraggingSlider.current) {
        handleSliderMove(e.touches[0].clientX);
      }
      if (isPanning) {
        setPan({ x: e.touches[0].clientX - panStart.x, y: e.touches[0].clientY - pan.y });
      }
    };

    const handleGlobalMouseUp = () => {
      isDraggingSlider.current = false;
      setIsPanning(false);
      if (containerRef.current) {
        containerRef.current.style.cursor = zoom > 1 ? 'grab' : 'default';
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchmove', handleGlobalTouchMove);
    window.addEventListener('touchend', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isPanning, panStart, handleSliderMove, zoom]);

  const transformStyle = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: 'center center',
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden rounded-lg"
      style={{ cursor: zoom > 1 ? 'grab' : 'default', touchAction: 'none' }}
      onMouseDown={handlePanMouseDown}
      onTouchStart={handlePanTouchStart}
    >
      <img
        src={after}
        alt="After"
        className="absolute top-0 left-0 w-full h-full object-contain"
        style={{ ...afterStyle, ...transformStyle }}
        draggable="false"
        onDragStart={(e) => e.preventDefault()}
        loading={loading}
      />
      <div
        className="absolute top-0 left-0 h-full w-full overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={before}
          alt="Before"
          className="absolute top-0 left-0 w-full h-full object-contain"
          style={transformStyle}
          draggable="false"
          onDragStart={(e) => e.preventDefault()}
          loading={loading}
        />
      </div>
      <div
        className="absolute top-0 h-full w-1 bg-cyan-400 cursor-ew-resize"
        style={{ left: `calc(${sliderPosition}% - 2px)` }}
      >
        <div
          data-role="slider-handle"
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-10 w-10 rounded-full bg-cyan-400/80 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center shadow-lg"
          onMouseDown={handleSliderMouseDown}
          onTouchStart={handleSliderTouchStart}
        >
          <svg className="w-5 h-5 text-white pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ImageSlider;
