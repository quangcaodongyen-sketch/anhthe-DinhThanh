import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CloseIcon } from './icons/CloseIcon';

interface ManualCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  aspectRatio: number;
  outputWidthMM: number;
  outputHeightMM: number;
  onSave: (croppedDataUrl: string) => void;
}

// Define types for state for clarity
interface Point { x: number; y: number; }
interface CropArea { x: number; y: number; width: number; height: number; }

const ManualCropModal: React.FC<ManualCropModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  aspectRatio,
  outputWidthMM,
  outputHeightMM,
  onSave
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [crop, setCrop] = useState<CropArea>({ x: 10, y: 10, width: 80, height: 80 / (aspectRatio > 0 ? aspectRatio : 1) });
  const [dragInfo, setDragInfo] = useState<{ type: 'move' | 'resize'; startPoint: Point; initialCrop: CropArea; handle?: string } | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const initCropBox = useCallback(() => {
      if (imageRef.current && imageRef.current.complete && containerRef.current) {
          const image = imageRef.current;
          const container = containerRef.current;

          const containerWidth = container.clientWidth;
          const containerHeight = container.clientHeight;

          const imageAspectRatio = image.naturalWidth / image.naturalHeight;
          const containerAspectRatio = containerWidth / containerHeight;
          
          let renderedImgWidth, renderedImgHeight;
          if(imageAspectRatio > containerAspectRatio){
              renderedImgWidth = containerWidth;
              renderedImgHeight = containerWidth / imageAspectRatio;
          } else {
              renderedImgHeight = containerHeight;
              renderedImgWidth = containerHeight * imageAspectRatio;
          }
          
          let initialWidth, initialHeight;
          
          initialWidth = renderedImgWidth * 0.8;
          initialHeight = aspectRatio > 0 ? initialWidth / aspectRatio : renderedImgHeight * 0.8;
          
          if (initialHeight > renderedImgHeight * 0.95) {
            initialHeight = renderedImgHeight * 0.95;
            initialWidth = aspectRatio > 0 ? initialHeight * aspectRatio : initialWidth;
          }
           if (initialWidth > renderedImgWidth * 0.95) {
            initialWidth = renderedImgWidth * 0.95;
            initialHeight = aspectRatio > 0 ? initialWidth / aspectRatio : initialHeight;
          }

          const initialX = (containerWidth - initialWidth) / 2;
          const initialY = (containerHeight - initialHeight) / 2;

          setCrop({ x: initialX, y: initialY, width: initialWidth, height: initialHeight });
      }
  }, [aspectRatio]);

  useEffect(() => {
    if (isOpen && imageLoaded) {
      initCropBox();
    }
  }, [isOpen, imageLoaded, initCropBox]);

  const getRelativePoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    const rect = containerRef.current!.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, type: 'move' | 'resize', handle?: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startPoint = getRelativePoint(e);
    setDragInfo({ type, startPoint, initialCrop: crop, handle });
  };
  
  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragInfo) return;
    e.preventDefault();
    e.stopPropagation();

    const currentPoint = getRelativePoint(e as any);
    const dx = currentPoint.x - dragInfo.startPoint.x;
    const dy = currentPoint.y - dragInfo.startPoint.y;
    const container = containerRef.current!;

    let newCrop = { ...dragInfo.initialCrop };

    if (dragInfo.type === 'move') {
      newCrop.x += dx;
      newCrop.y += dy;
    } else if (dragInfo.type === 'resize' && dragInfo.handle) {
      const { handle, initialCrop } = dragInfo;
      let { x, y, width, height } = initialCrop;
      
      // Calculate raw width/height changes
      if (handle.includes('right')) width += dx;
      if (handle.includes('left')) { width -= dx; x += dx; }
      if (handle.includes('bottom')) height += dy;
      if (handle.includes('top')) { height -= dy; y += dy; }

      // If aspect ratio is fixed, enforce it.
      if (aspectRatio > 0) {
        // Let the dimension changed by the primary drag direction dictate the other
        if (handle.includes('left') || handle.includes('right')) {
            height = width / aspectRatio;
        } else { // top, bottom, or corners (where vertical change is typically primary)
            width = height * aspectRatio;
        }

        // Recalculate position based on fixed aspect ratio
        if (handle.includes('top')) y = initialCrop.y + initialCrop.height - height;
        if (handle.includes('left')) x = initialCrop.x + initialCrop.width - width;
      }
      
      newCrop = { x, y, width, height };
    }

    // Clamp crop box within container boundaries
    newCrop.width = Math.max(20, newCrop.width);
    newCrop.height = Math.max(20, newCrop.height);

    if (newCrop.width > container.clientWidth) {
        newCrop.width = container.clientWidth;
        if(aspectRatio > 0) newCrop.height = newCrop.width / aspectRatio;
    }
     if (newCrop.height > container.clientHeight) {
        newCrop.height = container.clientHeight;
        if(aspectRatio > 0) newCrop.width = newCrop.height * aspectRatio;
    }
    
    newCrop.x = Math.max(0, Math.min(newCrop.x, container.clientWidth - newCrop.width));
    newCrop.y = Math.max(0, Math.min(newCrop.y, container.clientHeight - newCrop.height));

    setCrop(newCrop);
  }, [dragInfo, aspectRatio]);

  const handleMouseUp = useCallback(() => {
    setDragInfo(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove as any);
    window.addEventListener('touchend', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove as any);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);


  const handleSave = () => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!image || !canvas || !container || !image.complete || image.naturalWidth === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // STEP 1: Determine the actual size and position of the displayed image inside its container.
    const imageAspectRatio = image.naturalWidth / image.naturalHeight;
    const containerAspectRatio = container.clientWidth / container.clientHeight;
    let renderedImgWidth, renderedImgHeight, renderedImgX, renderedImgY;
    if (imageAspectRatio > containerAspectRatio) {
        renderedImgWidth = container.clientWidth;
        renderedImgHeight = container.clientWidth / imageAspectRatio;
        renderedImgX = 0;
        renderedImgY = (container.clientHeight - renderedImgHeight) / 2;
    } else {
        renderedImgHeight = container.clientHeight;
        renderedImgWidth = container.clientHeight * imageAspectRatio;
        renderedImgY = 0;
        renderedImgX = (container.clientWidth - renderedImgWidth) / 2;
    }

    // STEP 2: Calculate the scaling factor between the displayed image and the original, full-resolution image.
    const scaleX = image.naturalWidth / renderedImgWidth;
    const scaleY = image.naturalHeight / renderedImgHeight;

    // STEP 3: Convert the on-screen crop coordinates to source coordinates on the original image.
    const sx = (crop.x - renderedImgX) * scaleX;
    const sy = (crop.y - renderedImgY) * scaleY;
    const sWidth = crop.width * scaleX;
    const sHeight = crop.height * scaleY;

    // STEP 4: Calculate the target canvas dimensions in pixels.
    const DPI = 300;
    const MM_PER_INCH = 25.4;
    // If output dimensions are not specified (e.g., free crop), use the cropped source dimensions.
    const outputWidthPx = (outputWidthMM > 0)
        ? Math.round((outputWidthMM * DPI) / MM_PER_INCH)
        : Math.round(sWidth);
    const outputHeightPx = (outputHeightMM > 0)
        ? Math.round((outputHeightMM * DPI) / MM_PER_INCH)
        : Math.round(sHeight);
    
    canvas.width = outputWidthPx;
    canvas.height = outputHeightPx;

    // STEP 5: Draw the cropped section onto the canvas.
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, outputWidthPx, outputHeightPx);
    
    // STEP 6: Export the canvas content as a high-quality data URL.
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onSave(dataUrl);
  };
  
  if (!isOpen) return null;
  
  const resizeHandles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  const edgeHandles = aspectRatio <= 0 ? ['top', 'bottom', 'left', 'right'] : [];


  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" role="dialog" aria-modal="true">
      <div className="bg-[#10172A] rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-slate-700">
        <header className="flex items-center justify-between p-4 border-b border-slate-800 flex-shrink-0">
          <h2 className="text-xl font-bold text-cyan-400">Chỉnh sửa thủ công</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" aria-label="Đóng"><CloseIcon className="w-6 h-6" /></button>
        </header>
        
        <main className="flex-grow p-4 min-h-0">
          <div ref={containerRef} className="w-full h-full relative select-none overflow-hidden bg-black flex items-center justify-center">
            <img ref={imageRef} src={imageSrc} className="max-w-full max-h-full object-contain" alt="Crop source" onLoad={() => setImageLoaded(true)} loading="lazy" />

            {imageLoaded && (
              <>
                <div className="absolute inset-0 bg-black/50" style={{
                  clipPath: `path('M0 0 H${containerRef.current?.clientWidth || 0} V${containerRef.current?.clientHeight || 0} H0 Z M${crop.x} ${crop.y} V${crop.y + crop.height} H${crop.x + crop.width} V${crop.y} Z')`,
                  fillRule: 'evenodd'
                }}></div>
                
                <div
                  className="absolute border-2 border-dashed border-white cursor-move"
                  style={{
                    left: crop.x,
                    top: crop.y,
                    width: crop.width,
                    height: crop.height,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, 'move')}
                  onTouchStart={(e) => handleMouseDown(e, 'move')}
                >
                  <div className="absolute top-[20%] w-full h-px bg-white/50" title="Đỉnh đầu nên ở gần đây"></div>
                  <div className="absolute bottom-[10%] w-full h-px bg-white/50" title="Cằm nên ở gần đây"></div>
                  <div className="absolute left-1/2 top-0 h-full w-px bg-white/50"></div>

                  {resizeHandles.map(handle => (
                    <div
                      key={handle}
                      className="absolute w-4 h-4 bg-white rounded-full border-2 border-slate-800"
                      style={{
                        top: handle.includes('top') ? -8 : undefined,
                        bottom: handle.includes('bottom') ? -8 : undefined,
                        left: handle.includes('left') ? -8 : undefined,
                        right: handle.includes('right') ? -8 : undefined,
                        cursor: handle.includes('top-left') || handle.includes('bottom-right') ? 'nwse-resize' : 'nesw-resize'
                      }}
                      onMouseDown={(e) => handleMouseDown(e, 'resize', handle)}
                      onTouchStart={(e) => handleMouseDown(e, 'resize', handle)}
                    />
                  ))}
                   {edgeHandles.map(handle => (
                    <div
                      key={handle}
                      className="absolute"
                      style={{
                        top: handle === 'top' ? -4 : (handle === 'bottom' ? undefined : '50%'),
                        bottom: handle === 'bottom' ? -4 : undefined,
                        left: handle === 'left' ? -4 : (handle === 'right' ? undefined : '50%'),
                        right: handle === 'right' ? -4 : undefined,
                        transform: (handle === 'top' || handle === 'bottom') ? 'translateY(-50%)' : 'translateX(-50%)',
                        width: (handle === 'top' || handle === 'bottom') ? '24px' : '8px',
                        height: (handle === 'left' || handle === 'right') ? '24px' : '8px',
                        cursor: (handle === 'top' || handle === 'bottom') ? 'ns-resize' : 'ew-resize',
                      }}
                       onMouseDown={(e) => handleMouseDown(e, 'resize', handle)}
                       onTouchStart={(e) => handleMouseDown(e, 'resize', handle)}
                    >
                      <div className="w-full h-full bg-white rounded-sm"></div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </main>

        <footer className="flex-shrink-0 flex items-center justify-end gap-3 p-4 border-t border-slate-800">
          <button onClick={onClose} className="bg-slate-700 text-slate-200 px-4 py-2 rounded-md text-sm font-semibold hover:bg-slate-600 transition-colors">Hủy</button>
          <button onClick={handleSave} className="bg-cyan-500 text-white px-6 py-2 rounded-md text-sm font-bold hover:bg-cyan-600 transition-colors">Lưu</button>
        </footer>
      </div>
      <canvas ref={canvasRef} className="hidden"></canvas>
      <style>{`.animate-fadeIn{animation:fadeIn .2s ease-out forwards}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
};

export default ManualCropModal;