import React, { useState, useEffect, useRef, useCallback } from 'react';
import ImageSlider from './ImageSlider';
import VideoModal from './VideoModal';
import ShareModal from './ShareModal';
import { DownloadIcon } from './icons/DownloadIcon';
import { ShareIcon } from './icons/ShareIcon';
import { Rotate3dIcon } from './icons/Rotate3dIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { SliderIcon } from './icons/SliderIcon';
import { SideBySideIcon } from './icons/SideBySideIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { AnimateIcon } from './icons/AnimateIcon';
import { BlurIcon } from './icons/BlurIcon';
import { SendIcon } from './icons/SendIcon';
import { IDCardIcon } from './icons/IDCardIcon';
import { BookmarkIcon } from './icons/BookmarkIcon';
import ManualCropModal from './ManualCropModal';
import { TuneIcon } from './icons/TuneIcon';
import type { RestorationOptions } from '../types';
import type { LocalUser } from '../services/dbService';
import type { LayoutImage } from './PrintLayoutPage';
import { UserPlusIcon } from './icons/UserPlusIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import ImageUploader from './ImageUploader';
import { UploadIcon } from './icons/UploadIcon';


interface ResultViewerProps {
  originalImage: string | null;
  restoredImages: string[] | null;
  isLoading: boolean;
  error: string | null;
  progress: number;
  totalForProgress: number;
  onGenerateVideo: (imageToAnimate: string | null) => void;
  isVideoLoading: boolean;
  videoError: string | null;
  generatedVideoUrl: string | null;
  onCloseVideo: () => void;
  onUpscaleImage: (imageIndex: number, scaleFactor: number) => void;
  isUpscaling: boolean;
  upscalingState: { index: number | null; factor: number | null };
  onRecolorImage: (imageIndex: number, colorStyle: string) => void;
  isRecoloring: { index: number | null; style: string | null };
  onRevertToOriginalColor: (imageIndex: number) => void;
  onApplyStyle: (imageIndex: number, artisticStyle: string) => void;
  isApplyingStyle: { index: number | null; style: string | null };
  onAnimatePortrait: (imageToAnimate: string | null) => void;
  isPortraitAnimating: boolean;
  onBlurBackground: (imageIndex: number, intensity: 'subtle' | 'medium' | 'strong') => void;
  isBlurring: { index: number | null; intensity: string | null };
  onRemoveObject: (imageIndex: number, maskDataUrl: string) => void;
  isRemovingObject: { [index: number]: boolean };
  onSendToUpscaler: (imageData: string) => void;
  onApplyProColor: (imageIndex: number) => void;
  isApplyingProColor: { [index: number]: boolean };
  onNavigateToIDPhoto: (imageData: string) => void;
  onUpdateImage: (imageIndex: number, newImageDataUrl: string) => void;
  onOpenCustomerModal: (notes: string, restored: string, original: string) => void;
  onQuickSave: (restored: string, original: string) => void;
  onNavigateToPrintLayout: (image: LayoutImage) => void;
  currentUser: LocalUser;

  // Props from former ControlPanel
  options: RestorationOptions;
  setOptions: React.Dispatch<React.SetStateAction<RestorationOptions>>;
  onImageUpload: (file: File | null) => void;
  isImageUploaded: boolean;
  onRestore: () => void;
  previewUrl: string | null;
  onAnalyzeImage: () => void;
  isAnalyzing: boolean;
  analysisError: string | null;
  onClothingUpload: (file: File | null) => void;
  clothingFile: File | null;
  onReferenceImageUpload: (file: File | null) => void;
  referenceImageFile: File | null;
}

const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-700/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 font-semibold text-slate-200 hover:bg-slate-700/50"
      >
        <span>{title}</span>
        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="p-3 pt-0">{children}</div>}
    </div>
  );
};


const CROP_PRESETS = [
    { name: 'Kích thước thẻ phổ thông', sizes: ['2x3', '3x4', '4x6'] },
    { name: 'Visa & Hộ chiếu', sizes: ['visa_us', 'visa_eu', 'passport_vn'] },
    { name: 'Tự do & Mạng xã hội', sizes: ['free', '1:1', '4:5', '16:9'] }
];

const CROP_DEFINITIONS = {
    '2x3': { name: '2x3 cm', aspectRatio: 2 / 3, widthMM: 20, heightMM: 30 },
    '3x4': { name: '3x4 cm', aspectRatio: 3 / 4, widthMM: 30, heightMM: 40 },
    '4x6': { name: '4x6 cm', aspectRatio: 4 / 6, widthMM: 40, heightMM: 60 },
    'visa_us': { name: 'Visa Mỹ (51x51 mm)', aspectRatio: 1, widthMM: 51, heightMM: 51 },
    'visa_eu': { name: 'Visa Schengen (35x45 mm)', aspectRatio: 35 / 45, widthMM: 35, heightMM: 45 },
    'passport_vn': { name: 'Hộ chiếu VN (40x60 mm)', aspectRatio: 4 / 6, widthMM: 40, heightMM: 60 },
    'free': { name: 'Tự do', aspectRatio: 0, widthMM: 0, heightMM: 0 },
    '1:1': { name: 'Vuông (1:1)', aspectRatio: 1, widthMM: 100, heightMM: 100 },
    '4:5': { name: 'Instagram Post (4:5)', aspectRatio: 4 / 5, widthMM: 100, heightMM: 125 },
    '16:9': { name: 'Story / Màn hình rộng (16:9)', aspectRatio: 16 / 9, widthMM: 160, heightMM: 90 },
};
type CropKey = keyof typeof CROP_DEFINITIONS;

const videoLoadingMessages = [
    'AI đang khởi tạo mô hình video...',
    'Đang phân tích hình ảnh của bạn...',
    'Render các khung hình đầu tiên...',
    'Quá trình này có thể mất vài phút, vui lòng kiên nhẫn.',
    'Sắp xong rồi, đang hoàn thiện những chi tiết cuối cùng...',
    'Tối ưu hóa video đầu ra...'
];

const ZoomInIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    <line x1="11" y1="8" x2="11" y2="14"></line>
    <line x1="8" y1="11" x2="14" y2="11"></line>
  </svg>
);

const ZoomOutIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    <line x1="8" y1="11" x2="14" y2="11"></line>
  </svg>
);

interface ZoomableImageProps {
  src: string;
  alt: string;
  zoom: number;
  imgStyle?: React.CSSProperties;
  imgRef?: React.RefObject<HTMLImageElement>;
  className?: string;
  loading?: 'lazy' | 'eager';
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({ src, alt, zoom, imgStyle, imgRef, className, loading }) => {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (zoom <= 1) {
      setPan({ x: 0, y: 0 });
    }
  }, [zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    e.stopPropagation();
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPanning(false);
    if (containerRef.current) containerRef.current.style.cursor = 'grab';
  };
  
  const handleMouseLeave = (e: React.MouseEvent) => {
    if (isPanning) {
        handleMouseUp(e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    e.stopPropagation();
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom <= 1) return;
    e.stopPropagation();
    setIsPanning(true);
    setPanStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    setIsPanning(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPanning) return;
    e.stopPropagation();
    setPan({ x: e.touches[0].clientX - panStart.x, y: e.touches[0].clientY - panStart.y });
  };

  const transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;

  return (
    <div
      ref={containerRef}
      className={`w-full h-full overflow-hidden ${className || ''}`}
      style={{ cursor: zoom > 1 ? 'grab' : 'default', touchAction: 'none' }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="w-full h-full object-contain transition-transform duration-100 ease-out"
        style={{ ...imgStyle, transform, transformOrigin: 'center center' }}
        draggable="false"
        onDragStart={(e) => e.preventDefault()}
        loading={loading}
      />
    </div>
  );
};

const createThumbnail = (imageDataUrl: string, maxWidth: number = 256): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imageDataUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = Math.min(maxWidth / img.width, 1);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
    });
};


const ResultViewer: React.FC<ResultViewerProps> = (props) => {
  const { 
    originalImage, restoredImages, isLoading, error,
    progress, totalForProgress,
    onGenerateVideo, isVideoLoading, videoError, generatedVideoUrl, onCloseVideo,
    onUpscaleImage, isUpscaling, upscalingState,
    onRecolorImage, isRecoloring, onRevertToOriginalColor,
    onApplyStyle, isApplyingStyle,
    onAnimatePortrait, isPortraitAnimating,
    onBlurBackground, isBlurring,
    onRemoveObject, isRemovingObject,
    onSendToUpscaler,
    onApplyProColor, isApplyingProColor,
    onNavigateToIDPhoto,
    onUpdateImage,
    onOpenCustomerModal,
    onQuickSave,
    onNavigateToPrintLayout,
    currentUser,
    // ControlPanel props
    options, setOptions, onImageUpload, isImageUploaded, onRestore, previewUrl,
    onAnalyzeImage, isAnalyzing, analysisError, onClothingUpload, clothingFile,
    onReferenceImageUpload, referenceImageFile
  } = props;

  const [activeTab, setActiveTab] = useState<'restore' | 'adjust' | 'finalize'>('restore');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [comparisonMode, setComparisonMode] = useState<'slider' | 'side-by-side'>('slider');
  const [isBlurMenuOpen, setIsBlurMenuOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [videoLoadingMessage, setVideoLoadingMessage] = useState(videoLoadingMessages[0]);
  const blurMenuRef = useRef<HTMLDivElement>(null);
  const [activeUpscale, setActiveUpscale] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  
  // Object Removal State
  const [isRemoveObjectMode, setIsRemoveObjectMode] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [isDrawing, setIsDrawing] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Cropping State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropConfig, setCropConfig] = useState<{aspectRatio: number, widthMM: number, heightMM: number}>({ aspectRatio: 0, widthMM: 0, heightMM: 0 });
  const [isCropDropdownOpen, setIsCropDropdownOpen] = useState(false);
  const cropDropdownRef = useRef<HTMLDivElement>(null);

  // ControlPanel state
  const [customColor, setCustomColor] = useState<string>('#00bfff');
  const [clothingMode, setClothingMode] = useState<'predefined' | 'custom' | 'upload'>('predefined');
  const [clothingPreviewUrl, setClothingPreviewUrl] = useState<string | null>(null);
  const clothingInputRef = useRef<HTMLInputElement>(null);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);


  const currentRestoredImage = restoredImages?.[currentIndex] ?? null;
  const isCurrentRemovingObject = isRemovingObject[currentIndex] ?? false;
  const isCurrentApplyingProColor = isApplyingProColor[currentIndex] ?? false;
  
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 8)); // Max zoom 800%
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.25)); // Min zoom 25%
  const handleZoomReset = () => setZoom(1);

  const isAnyActionLoading = isVideoLoading || isPortraitAnimating || isUpscaling || isRecoloring.index !== null || isApplyingStyle.index !== null || isBlurring.index !== null || isCurrentRemovingObject || isCurrentApplyingProColor;

  const handleWheel = (e: React.WheelEvent) => {
    if (!currentRestoredImage || isLoading || isAnyActionLoading) return;
    e.preventDefault();

    setZoom(prevZoom => {
      const scale = 1 - e.deltaY * 0.001;
      const newZoom = prevZoom * scale;
      return Math.max(0.25, Math.min(newZoom, 8)); // Clamp zoom between 25% and 800%
    });
  };

  useEffect(() => {
    setCurrentIndex(0);
    setBrightness(100);
    setContrast(100);
    setZoom(1);
  }, [restoredImages]);
  
  useEffect(() => {
    if (restoredImages && restoredImages.length > 0) {
        setActiveTab('adjust');
    }
  }, [restoredImages]);

  const handleAssignToCustomer = () => {
    if (!currentRestoredImage || !originalImage) return;

    let notes = "Công việc: Phục hồi ảnh\n";
    notes += `- Model sử dụng: ${options.model}\n`;
    if (options.advancedRestore) {
        notes += "- Chế độ: Phục hồi nâng cao (Chuyên nghiệp)\n";
    } else {
        notes += `- Chất lượng: ${options.highQuality ? 'Cao' : 'Thường'}\n`;
        notes += `- Lên màu: ${options.colorize ? 'Có' : 'Không (trắng đen)'}\n`;
    }
    if (options.clothing && options.clothing !== 'auto') {
        notes += `- Trang phục: ${options.clothing}\n`;
    }
    if (options.background && options.background !== 'auto') {
        notes += `- Phông nền: ${options.background}\n`;
    }
    if (options.customRequest) {
        notes += `- Yêu cầu thêm: ${options.customRequest}\n`;
    }

    onOpenCustomerModal(notes, currentRestoredImage, originalImage);
  };

  const handleSaveToArchive = () => {
    if (!currentRestoredImage || !originalImage) return;
    onQuickSave(currentRestoredImage, originalImage);
  };

  const handleOpenCropModal = (sizeKey: CropKey) => {
      const selectedSize = CROP_DEFINITIONS[sizeKey];
      setCropConfig({
          aspectRatio: selectedSize.aspectRatio,
          widthMM: selectedSize.widthMM,
          heightMM: selectedSize.heightMM,
      });
      setIsCropModalOpen(true);
      setIsCropDropdownOpen(false);
  };

  const handleSaveCroppedImage = (croppedDataUrl: string) => {
      onUpdateImage(currentIndex, croppedDataUrl);
      setIsCropModalOpen(false);
  };


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (blurMenuRef.current && !blurMenuRef.current.contains(event.target as Node)) {
            setIsBlurMenuOpen(false);
        }
        if (cropDropdownRef.current && !cropDropdownRef.current.contains(event.target as Node)) {
            setIsCropDropdownOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    let interval: number;
    if (isVideoLoading || isPortraitAnimating) {
        let i = 0;
        setVideoLoadingMessage(videoLoadingMessages[i % videoLoadingMessages.length]);
        i++;
        interval = window.setInterval(() => {
            setVideoLoadingMessage(videoLoadingMessages[i % videoLoadingMessages.length]);
            i++;
        }, 5000); // Change message every 5 seconds
    }
    return () => {
        if (interval) {
            clearInterval(interval);
        }
    };
  }, [isVideoLoading, isPortraitAnimating]);
  
  const clearCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (canvas) {
          const context = canvas.getContext('2d');
          if (context) {
              context.clearRect(0, 0, canvas.width, canvas.height);
          }
      }
  }, []);

  useEffect(() => {
      if (!isRemoveObjectMode) {
          clearCanvas();
          return;
      }

      const image = imageRef.current;
      const canvas = canvasRef.current;
      if (!image || !canvas) return;

      const resizeCanvas = () => {
          const { width, height, top, left } = image.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
          canvas.style.top = `${top}px`;
          canvas.style.left = `${left}px`;
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(dpr, dpr);
          }
      };

      const observer = new ResizeObserver(resizeCanvas);
      observer.observe(image);
      
      const imageLoadHandler = () => {
        // Timeout to ensure layout is stable
        setTimeout(resizeCanvas, 100);
      };
      image.addEventListener('load', imageLoadHandler);
      resizeCanvas(); // Initial resize

      return () => {
          observer.disconnect();
          image.removeEventListener('load', imageLoadHandler);
      };
  }, [isRemoveObjectMode, currentRestoredImage, clearCanvas]);


  const getCoordinates = (event: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
      return {
          x: clientX - rect.left,
          y: clientY - rect.top,
      };
  };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
      event.preventDefault();
      const coords = getCoordinates(event);
      if (coords) {
          setIsDrawing(true);
          lastPointRef.current = coords;
      }
  };

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      event.preventDefault();
      const coords = getCoordinates(event);
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (coords && context && lastPointRef.current) {
          context.beginPath();
          context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
          context.lineTo(coords.x, coords.y);
          context.strokeStyle = 'white';
          context.lineWidth = brushSize;
          context.lineCap = 'round';
          context.lineJoin = 'round';
          context.stroke();
          lastPointRef.current = coords;
      }
  };

  const finishDrawing = () => {
      setIsDrawing(false);
      lastPointRef.current = null;
  };

  const handleApplyRemoveObject = () => {
      const canvas = canvasRef.current;
      if (canvas) {
          const maskDataUrl = canvas.toDataURL('image/png');
          onRemoveObject(currentIndex, maskDataUrl);
          setIsRemoveObjectMode(false);
      }
  };


  const imageStyle = { filter: `brightness(${brightness}%) contrast(${contrast}%)` };
  
  const handleSaveImage = () => {
    if (currentRestoredImage) {
        const link = document.createElement('a');
        link.href = currentRestoredImage;
        link.download = `restored-photo-${currentIndex + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };
  
  const handlePrint = async () => {
    if (!currentRestoredImage || !originalImage || !currentUser?.id) {
        alert("Không có ảnh hợp lệ hoặc thông tin người dùng để in.");
        return;
    }

    try {
        const thumbnailUrl = await createThumbnail(currentRestoredImage);

        const imageToLayout: LayoutImage = {
            id: `print-session-${Date.now()}`,
            imageDataUrl: currentRestoredImage,
            thumbnailDataUrl: thumbnailUrl,
            originalImageUrl: originalImage,
            timestamp: Date.now(),
            userId: currentUser.id,
        };

        onNavigateToPrintLayout(imageToLayout);
    } catch (error) {
        console.error("Error preparing image for layout page:", error);
        alert("Đã xảy ra lỗi khi chuẩn bị ảnh để xếp trang in.");
    }
  };

  const handleShare = async () => {
    if (!currentRestoredImage) return;

    try {
        const response = await fetch(currentRestoredImage);
        const blob = await response.blob();
        const file = new File([blob], `restored-photo-${currentIndex + 1}.png`, { type: blob.type });

        const shareData = {
            files: [file],
            title: 'Ảnh Phục Hồi Bởi AI',
            text: 'Hãy xem bức ảnh kỷ niệm tôi vừa phục hồi bằng ứng dụng KHOI PHUC ANH CU!',
        };
        
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            setIsShareModalOpen(true);
        }
    } catch (error: any) {
        console.error('Error sharing:', error);
        if (error.name !== 'AbortError') {
             setIsShareModalOpen(true);
        }
    }
  };

  const handlePrev = () => {
    if (!restoredImages) return;
    setCurrentIndex(prev => (prev === 0 ? restoredImages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (!restoredImages) return;
    setCurrentIndex(prev => (prev === restoredImages.length - 1 ? 0 : prev + 1));
  };
    
  const renderSpinner = () => (
    <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  // START: Control Panel Logic
   useEffect(() => {
    if (clothingFile) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setClothingPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(clothingFile);
    } else {
        setClothingPreviewUrl(null);
    }
  }, [clothingFile]);
  
  useEffect(() => {
    if (referenceImageFile) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setReferencePreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(referenceImageFile);
    } else {
        setReferencePreviewUrl(null);
    }
  }, [referenceImageFile]);

  const handleOptionChange = (
    field: keyof RestorationOptions,
    value: string | boolean | number
  ) => {
    setOptions((prev) => ({ ...prev, [field]: value }));
  };
  
  const handleClothingModeChange = (mode: 'predefined' | 'custom' | 'upload') => {
    setClothingMode(mode);
    if (mode !== 'upload') {
        onClothingUpload(null); // Clear file if switching away from upload mode
    }
    if (mode === 'upload') {
        handleOptionChange('clothing', 'auto'); // Reset text prompt
    }
  };
  
  const handleClothingFileUpload = (file: File | null) => {
      if (file && file.type.startsWith('image/')) {
          onClothingUpload(file);
      }
  };

  const handleReferenceFileUpload = (file: File | null) => {
      if (file && file.type.startsWith('image/')) {
          onReferenceImageUpload(file);
      } else {
          onReferenceImageUpload(null);
      }
  };

  const PREDEFINED_BACKGROUND_OPTIONS = [ 'auto', 'Phông nền studio (xám, trắng, đen)', 'Thiên nhiên, cây xanh', 'Thư viện sách', 'Bối cảnh Tết cổ truyền', 'Bãi biển', 'Nền hoa sen', 'Phông nền màu xanh deepskyblue' ];
  const getBackgroundSelectValue = () => {
    if (PREDEFINED_BACKGROUND_OPTIONS.includes(options.background)) return options.background;
    if (options.background.startsWith('Phông nền màu trơn')) return 'custom-color';
    return 'custom-text';
  };
  const handleBackgroundSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    if (value === 'custom-color') handleOptionChange('background', `Phông nền màu trơn ${customColor}`);
    else if (value === 'custom-text') { if (PREDEFINED_BACKGROUND_OPTIONS.includes(options.background) || options.background.startsWith('Phông nền màu trơn')) { handleOptionChange('background', ''); } }
    else handleOptionChange('background', value);
  };
  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    handleOptionChange('background', `Phông nền màu trơn ${newColor}`);
  };
  const PREDEFINED_CLOTHING_OPTIONS = [ 'auto', 'Áo sơ mi', 'Áo sơ mi trắng', 'Áo sơ mi màu xám', 'Áo polo', 'Áo kiểu nữ', 'Áo thun', 'Áo vest', 'Vest đen lịch lãm', 'Đồ công sở', 'Khăn quàng đỏ', 'Áo dài', 'Áo dài đỏ truyền thống', 'Áo khoác quân đội' ];
  const PREDEFINED_HAIR_OPTIONS = [ 'auto', 'Gọn gàng', 'Tóc ngắn', 'Tóc dài', 'Buộc gọn', 'Thời trang', ];
  const getHairStyleSelectValue = () => PREDEFINED_HAIR_OPTIONS.includes(options.hairStyle) ? options.hairStyle : 'custom';
  const handleHairStyleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = e.target;
      if (value === 'custom') { if (PREDEFINED_HAIR_OPTIONS.includes(options.hairStyle)) handleOptionChange('hairStyle', ''); } 
      else handleOptionChange('hairStyle', value);
  };
  // END: Control Panel Logic

  const renderRestoreTab = () => (
    <div className="flex flex-col h-full">
        <div className="overflow-y-auto flex-grow">
            <div className="p-4"><ImageUploader onImageUpload={onImageUpload} previewUrl={previewUrl} /></div>
            
            <CollapsibleSection title="Chế độ Phục hồi" defaultOpen>
                <div className="space-y-4">
                     <div>
                        <label htmlFor="model" className="block text-sm font-medium text-slate-400 mb-1">Model</label>
                        <select id="model" value={options.model} onChange={e => handleOptionChange('model', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500">
                            <option>Nano Banana</option><option>Nano Banana HD</option><option>Qwen Image</option><option>Doubao Seedream4.0</option>
                        </select>
                    </div>
                    <label htmlFor="advancedRestore" className="flex items-center justify-between cursor-pointer p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800">
                        <span className="flex flex-col">
                            <span className="font-semibold text-slate-300">Phục hồi Chuyên nghiệp</span>
                            <span className="text-xs text-slate-500">Chất lượng studio, ghi đè các tùy chọn khác.</span>
                        </span>
                        <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${options.advancedRestore ? 'bg-cyan-500' : 'bg-slate-600'}`}>
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${options.advancedRestore ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </div>
                    </label>
                    <input type="checkbox" id="advancedRestore" checked={options.advancedRestore} onChange={e => handleOptionChange('advancedRestore', e.target.checked)} className="hidden"/>
                </div>
            </CollapsibleSection>

             <fieldset disabled={options.advancedRestore || !isImageUploaded} className="disabled:opacity-50">
                <CollapsibleSection title="Tùy chọn cơ bản">
                   <div className="space-y-4">
                        <label htmlFor="highQuality" className="flex items-center justify-between cursor-pointer"><span className="text-sm font-medium text-slate-300">Chất lượng cao</span><div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${options.highQuality ? 'bg-cyan-500' : 'bg-slate-600'}`}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${options.highQuality ? 'translate-x-6' : 'translate-x-1'}`}/></div></label>
                        <input type="checkbox" id="highQuality" checked={options.highQuality} onChange={e => handleOptionChange('highQuality', e.target.checked)} className="hidden"/>
                        <label htmlFor="sharpenBackground" className="flex items-center justify-between cursor-pointer"><span className="text-sm font-medium text-slate-300">Làm nét phông nền</span><div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${options.sharpenBackground ? 'bg-cyan-500' : 'bg-slate-600'}`}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${options.sharpenBackground ? 'translate-x-6' : 'translate-x-1'}`}/></div></label>
                        <input type="checkbox" id="sharpenBackground" checked={options.sharpenBackground} onChange={e => handleOptionChange('sharpenBackground', e.target.checked)} className="hidden"/>
                   </div>
                </CollapsibleSection>
                <CollapsibleSection title="Tùy chọn chi tiết">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label htmlFor="numPeople" className="block text-sm font-medium text-slate-400 mb-1">Số người</label><input type="number" id="numPeople" value={options.numPeople} onChange={e => handleOptionChange('numPeople', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm" min="1"/></div>
                        <div><label htmlFor="gender" className="block text-sm font-medium text-slate-400 mb-1">Giới tính</label><select id="gender" value={options.gender} onChange={e => handleOptionChange('gender', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm"><option value="auto">Tự động</option><option>Nam</option><option>Nữ</option></select></div>
                        <div><label htmlFor="age" className="block text-sm font-medium text-slate-400 mb-1">Độ tuổi</label><select id="age" value={options.age} onChange={e => handleOptionChange('age', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm"><option value="auto">Tự động</option><option>20-30</option><option>30-40</option><option>Trên 60</option></select></div>
                        <div><label htmlFor="smile" className="block text-sm font-medium text-slate-400 mb-1">Nụ cười</label><select id="smile" value={options.smile} onChange={e => handleOptionChange('smile', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm"><option value="auto">Tự động</option><option>Cười</option><option>Không cười</option></select></div>
                    </div>
                </CollapsibleSection>
            </fieldset>
            
            <fieldset disabled={!isImageUploaded} className="disabled:opacity-50">
                 <CollapsibleSection title="Tùy chọn sáng tạo">
                    <div className="space-y-4">
                        <div className="space-y-2"><label className="block text-sm font-medium text-slate-400">Trang phục</label><div className="grid grid-cols-3 gap-1 bg-slate-800 rounded-md p-1"><button onClick={() => handleClothingModeChange('predefined')} className={`px-2 py-1 text-xs sm:text-sm rounded ${clothingMode === 'predefined' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-700'}`}>Mẫu có sẵn</button><button onClick={() => handleClothingModeChange('custom')} className={`px-2 py-1 text-xs sm:text-sm rounded ${clothingMode === 'custom' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-700'}`}>Văn bản</button><button onClick={() => handleClothingModeChange('upload')} className={`px-2 py-1 text-xs sm:text-sm rounded ${clothingMode === 'upload' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-700'}`}>Tải lên</button></div>
                        {clothingMode === 'predefined' && (<select value={options.clothing} onChange={e => handleOptionChange('clothing', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm">{PREDEFINED_CLOTHING_OPTIONS.map(o => (<option key={o} value={o}>{o === 'auto' ? 'Giữ nguyên' : o}</option>))}</select>)}
                        {clothingMode === 'custom' && (<textarea value={options.clothing === 'auto' || PREDEFINED_CLOTHING_OPTIONS.includes(options.clothing) ? '' : options.clothing} onChange={e => handleOptionChange('clothing', e.target.value)} rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm" placeholder="VD: áo dài màu xanh ngọc bích"/>)}
                        {clothingMode === 'upload' && (<div><input type="file" accept="image/*" ref={clothingInputRef} onChange={(e) => handleClothingFileUpload(e.target.files ? e.target.files[0] : null)} className="hidden" /><div onClick={() => clothingInputRef.current?.click()} className="relative group flex justify-center items-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer bg-slate-800 border-slate-600 hover:border-cyan-500">{clothingPreviewUrl ? (<img src={clothingPreviewUrl} alt="Xem trước" className="object-contain h-full w-full rounded-md p-1" />) : (<div className="text-center text-slate-400"><UploadIcon className="mx-auto h-8 w-8 mb-1" /><p className="text-xs font-semibold">Tải ảnh trang phục</p></div>)}</div></div>)}
                        </div>
                         {/* ... Other creative options like Hair, Background, Mimic ... */}
                    </div>
                 </CollapsibleSection>
            </fieldset>
             <CollapsibleSection title="Yêu cầu AI">
                <div className="space-y-3">
                    <div className="flex justify-end"><button onClick={onAnalyzeImage} disabled={!isImageUploaded || isAnalyzing} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-50">{isAnalyzing ? <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Phân tích...</span></> : <><SparklesIcon className="w-4 h-4" /><span>Phân tích & Đề xuất Prompt</span></>}</button></div>
                    {analysisError && !isAnalyzing && (<p className="text-xs text-red-400">{analysisError}</p>)}
                    <textarea id="customRequest" value={options.customRequest} onChange={e => handleOptionChange('customRequest', e.target.value)} rows={4} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm" placeholder="Nhấn nút 'Phân tích ảnh bằng AI' hoặc nhập yêu cầu của bạn..." />
                </div>
             </CollapsibleSection>
        </div>
        <div className="p-4 border-t border-slate-800 flex-shrink-0 space-y-3">
             <div><label htmlFor="numResults" className="block text-sm font-medium text-slate-400 mb-1">Số lượng kết quả (tối đa 5)</label><input type="number" id="numResults" value={options.numResults} onChange={e => handleOptionChange('numResults', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm" min="1" max="5"/></div>
            <button onClick={onRestore} disabled={!isImageUploaded || isLoading} className="w-full bg-cyan-500 text-white px-4 py-3 rounded-md text-base font-bold hover:bg-cyan-600 transition-colors disabled:bg-cyan-800 disabled:text-cyan-400 disabled:cursor-not-allowed flex items-center justify-center">{isLoading ? <>{renderSpinner()}<span>ĐANG PHỤC HỒI...</span></> : 'PHỤC HỒI ẢNH'}</button>
        </div>
    </div>
  );

  const renderAdjustTab = () => {
    const upscaleOptions = [{ name: '2K', factor: 2 }, { name: '4K', factor: 4 }, { name: '8K', factor: 8 }, { name: '16K', factor: 16 }];
    const blurOptions: { id: 'subtle' | 'medium' | 'strong'; name: string }[] = [{ id: 'subtle', name: 'Mờ nhẹ' }, { id: 'medium', name: 'Mờ vừa' }, { id: 'strong', name: 'Mờ mạnh' }];
    const styleAndColorOptions: { id: string; name: string; type: string; icon?: React.FC<React.SVGProps<SVGSVGElement>> }[] = [ { id: 'pro-color', name: 'Làm đẹp AI', type: 'pro-color', icon: SparklesIcon }, { id: 'original', name: 'Màu gốc', type: 'revert' }, { id: 'black-and-white', name: 'Đen trắng', type: 'recolor' }, { id: 'clear-and-bright', name: 'Trong sáng', type: 'recolor' }, { id: 'rosy-skin', name: 'Da hồng hào', type: 'recolor' }, { id: 'classic-film', name: 'Film Cổ Điển', type: 'style' }, { id: 'oil-painting', name: 'Màu Sơn Dầu', type: 'style' }, { id: 'vibrant-dawn', name: 'Hừng Đông', type: 'style' }];

    return (
        <div className="overflow-y-auto">
             {!currentRestoredImage ? <div className="p-4 text-center text-slate-500">Các công cụ sẽ khả dụng sau khi ảnh được phục hồi.</div> :
             <>
                <CollapsibleSection title="Nâng cấp & Phóng to" defaultOpen>
                    <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-2">
                           {upscaleOptions.map(opt => (<button key={opt.name} onClick={() => { setActiveUpscale(opt.factor); onUpscaleImage(currentIndex, opt.factor);}} disabled={isAnyActionLoading} className={`px-2 py-2 text-xs font-semibold rounded-md transition-colors disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400 ${activeUpscale === opt.factor || (isUpscaling && upscalingState.factor === opt.factor) ? 'bg-cyan-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>{isUpscaling && upscalingState.factor === opt.factor ? <svg className="animate-spin h-4 w-4 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : opt.name}</button>))}
                        </div>
                    </div>
                </CollapsibleSection>
                <CollapsibleSection title="Màu sắc & Phong cách" defaultOpen>
                    <div className="grid grid-cols-2 gap-2">
                        {styleAndColorOptions.map(option => {
                            const isRecolorLoading = isRecoloring.index === currentIndex && isRecoloring.style === option.id;
                            const isStyleLoading = isApplyingStyle.index === currentIndex && isApplyingStyle.style === option.id;
                            const isProColorLoading = isApplyingProColor[currentIndex] && option.type === 'pro-color';
                            const isLoadingCurrent = isRecolorLoading || isStyleLoading || isProColorLoading;
                            const handleClick = () => { if (option.type === 'revert') { onRevertToOriginalColor(currentIndex); } else if (option.type === 'recolor') { onRecolorImage(currentIndex, option.id); } else if (option.type === 'style') { onApplyStyle(currentIndex, option.id); } else if (option.type === 'pro-color') { onApplyProColor(currentIndex); } };
                            const Icon = (option as any).icon;
                            return (<button key={option.id} onClick={handleClick} disabled={isAnyActionLoading} className="bg-slate-700 text-slate-200 px-3 py-2 rounded-md text-sm font-semibold hover:bg-slate-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">{isLoadingCurrent ? <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>...</span></> : <>{Icon && <Icon className="w-4 h-4" />}<span>{option.name}</span></>}</button>);
                        })}
                    </div>
                </CollapsibleSection>
                <CollapsibleSection title="Hiệu ứng & Công cụ">
                   <div className="grid grid-cols-2 gap-2">
                     <button onClick={() => setIsRemoveObjectMode(true)} disabled={isAnyActionLoading} className="bg-slate-700 text-slate-200 p-2 rounded-md text-sm font-semibold hover:bg-slate-600 transition-colors disabled:opacity-50 flex flex-col items-center justify-center gap-1 h-16"><span>Xóa vật thể</span></button>
                      <div className="relative" ref={blurMenuRef}>
                        <button onClick={() => setIsBlurMenuOpen(p => !p)} disabled={isAnyActionLoading} className="w-full bg-slate-700 text-slate-200 p-2 rounded-md text-sm font-semibold hover:bg-slate-600 transition-colors disabled:opacity-50 flex flex-col items-center justify-center gap-1 h-16"><BlurIcon className="w-5 h-5" /><span>Làm mờ nền</span></button>
                        {isBlurMenuOpen && (<div className="absolute bottom-full right-0 mb-2 w-full bg-slate-600 rounded-md shadow-lg z-20 overflow-hidden"><ul className="text-sm text-slate-200">{blurOptions.map((option) => (<li key={option.id}><button onClick={() => { onBlurBackground(currentIndex, option.id); setIsBlurMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-cyan-500 transition-colors">{option.name}</button></li>))}</ul></div>)}
                      </div>
                      <div className="relative col-span-2" ref={cropDropdownRef}>
                        <button onClick={() => setIsCropDropdownOpen(p => !p)} disabled={isAnyActionLoading} className="w-full bg-slate-700 text-slate-200 p-2 rounded-md text-sm font-semibold hover:bg-slate-600 transition-colors disabled:opacity-50 flex flex-col items-center justify-center gap-1 h-16"><TuneIcon className="w-5 h-5" /><span>Cắt ảnh</span></button>
                        {isCropDropdownOpen && (<div className="absolute bottom-full right-0 mb-2 w-full bg-slate-600 rounded-md shadow-lg z-20 overflow-hidden">{CROP_PRESETS.map(preset => (<div key={preset.name}><h5 className="px-3 py-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">{preset.name}</h5><ul>{preset.sizes.map(key => { const size = CROP_DEFINITIONS[key as CropKey]; return <li key={key}><button onClick={() => handleOpenCropModal(key as CropKey)} className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-cyan-500 transition-colors">{size.name}</button></li> })}</ul></div>))}</div>)}
                      </div>
                   </div>
                </CollapsibleSection>
                <CollapsibleSection title="Tinh chỉnh thủ công">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2"><label htmlFor="brightness-slider" className="text-sm shrink-0 w-20">Độ sáng</label><input id="brightness-slider" type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer" /><span className="text-sm font-mono w-10 text-center">{brightness}%</span></div>
                        <div className="flex items-center gap-2"><label htmlFor="contrast-slider" className="text-sm shrink-0 w-20">Tương phản</label><input id="contrast-slider" type="range" min="50" max="150" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer" /><span className="text-sm font-mono w-10 text-center">{contrast}%</span></div>
                    </div>
                </CollapsibleSection>
             </>
             }
        </div>
    );
  };
  
  const renderFinalizeTab = () => (
    <div className="overflow-y-auto">
        {!currentRestoredImage ? <div className="p-4 text-center text-slate-500">Hoàn thành ảnh để xem các tùy chọn tại đây.</div> :
        <>
            <CollapsibleSection title="Công cụ Video AI" defaultOpen>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => onGenerateVideo(currentRestoredImage)} disabled={isAnyActionLoading} className="bg-slate-700 text-slate-200 px-3 py-2 rounded-md text-sm font-semibold hover:bg-slate-600 disabled:opacity-50 flex flex-col items-center justify-center gap-1 h-20">{isVideoLoading ? <><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Đang tạo...</span></> : <><Rotate3dIcon className="w-6 h-6" /><span>Ảnh 360°</span></>}</button>
                    <button onClick={() => onAnimatePortrait(currentRestoredImage)} disabled={isAnyActionLoading} className="bg-slate-700 text-slate-200 px-3 py-2 rounded-md text-sm font-semibold hover:bg-slate-600 disabled:opacity-50 flex flex-col items-center justify-center gap-1 h-20">{isPortraitAnimating ? <><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Đang tạo...</span></> : <><AnimateIcon className="w-6 h-6" /><span>Chuyển động</span></>}</button>
                </div>
            </CollapsibleSection>
            <CollapsibleSection title="Chuyển tiếp công việc">
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => currentRestoredImage && onNavigateToIDPhoto(currentRestoredImage)} disabled={isAnyActionLoading} className="bg-slate-700 text-slate-200 p-2 rounded-md text-sm font-semibold hover:bg-slate-600 disabled:opacity-50 flex flex-col items-center justify-center gap-1 h-20"><IDCardIcon className="w-6 h-6" /><span>Làm ảnh thẻ</span></button>
                    <button onClick={() => currentRestoredImage && onSendToUpscaler(currentRestoredImage)} disabled={isAnyActionLoading} className="bg-slate-700 text-slate-200 p-2 rounded-md text-sm font-semibold hover:bg-slate-600 disabled:opacity-50 flex flex-col items-center justify-center gap-1 h-20"><SendIcon className="w-6 h-6" /><span>Nâng cấp ảnh</span></button>
                    <button onClick={handlePrint} disabled={isAnyActionLoading} className="bg-slate-700 text-slate-200 p-2 rounded-md text-sm font-semibold hover:bg-slate-600 disabled:opacity-50 flex flex-col items-center justify-center gap-1 h-20"><PrinterIcon className="w-6 h-6" /><span>Xếp & In ảnh</span></button>
                </div>
            </CollapsibleSection>
             <CollapsibleSection title="Xuất & Lưu trữ" defaultOpen>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleSaveImage} disabled={isAnyActionLoading} className="bg-slate-700 text-slate-200 p-2 rounded-md text-sm font-semibold hover:bg-slate-600 disabled:opacity-50 flex flex-col items-center justify-center gap-1 h-20"><DownloadIcon className="w-6 h-6" /><span>Tải về máy</span></button>
                    <button onClick={handleShare} disabled={isAnyActionLoading} className="bg-slate-700 text-slate-200 p-2 rounded-md text-sm font-semibold hover:bg-slate-600 disabled:opacity-50 flex flex-col items-center justify-center gap-1 h-20"><ShareIcon className="w-6 h-6" /><span>Chia sẻ</span></button>
                    <button onClick={handleSaveToArchive} disabled={isAnyActionLoading || !currentRestoredImage} className="bg-slate-700 text-slate-200 p-2 rounded-md text-sm font-semibold hover:bg-slate-600 disabled:opacity-50 flex flex-col items-center justify-center gap-1 h-20"><BookmarkIcon className="w-6 h-6" /><span>Lưu nhanh</span></button>
                    <button onClick={handleAssignToCustomer} disabled={isAnyActionLoading || !currentRestoredImage} className="bg-green-600 text-white p-2 rounded-md text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex flex-col items-center justify-center gap-1 h-20"><UserPlusIcon className="w-6 h-6" /><span>Giao cho Khách</span></button>
                </div>
            </CollapsibleSection>
        </>
        }
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full page-enter-animation">
        {generatedVideoUrl && <VideoModal videoUrl={generatedVideoUrl} onClose={onCloseVideo} />}
        {isCropModalOpen && currentRestoredImage && (<ManualCropModal isOpen={isCropModalOpen} onClose={() => setIsCropModalOpen(false)} imageSrc={currentRestoredImage} aspectRatio={cropConfig.aspectRatio} outputWidthMM={cropConfig.widthMM} outputHeightMM={cropConfig.heightMM} onSave={handleSaveCroppedImage}/>)}
        <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} imageToShare={currentRestoredImage} onDownload={handleSaveImage} />

        {/* --- CENTER COLUMN: IMAGE VIEWER --- */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-[400px]">
            <div onWheel={handleWheel} className="flex-grow w-full bg-slate-800 rounded-lg flex items-center justify-center relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 rounded-lg backdrop-blur-sm">
                        <svg className="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <p className="mt-4 text-lg text-white">AI đang phục hồi ảnh của bạn...</p>
                        {totalForProgress > 1 && (
                            <div className="w-3/4 max-w-sm mt-4">
                                <div className="flex justify-between text-sm font-medium text-slate-300 mb-1"><span>Tiến độ</span><span>{progress} / {totalForProgress} ảnh</span></div>
                                <div className="w-full bg-slate-600 rounded-full h-2.5"><div className="bg-cyan-500 h-2.5 rounded-full transition-all duration-300" style={{ width: totalForProgress > 0 ? `${(progress / totalForProgress) * 100}%` : '0%' }}></div></div>
                            </div>
                        )}
                        <p className="text-sm text-slate-400 mt-2">Quá trình này có thể mất một vài phút.</p>
                    </div>
                )}
                {(isVideoLoading || isPortraitAnimating || isCurrentRemovingObject) && ( <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 rounded-lg backdrop-blur-sm"><svg className="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p className="mt-4 text-lg text-white">{isCurrentRemovingObject ? 'AI đang xóa đối tượng...' : 'Đang tạo video của bạn...'}</p>{ (isVideoLoading || isPortraitAnimating) && <p className="text-sm text-slate-300 mt-2 text-center px-4 transition-opacity duration-500">{videoLoadingMessage}</p>}</div>)}
                {(error || videoError) && !isLoading && !isVideoLoading && !isPortraitAnimating && (<div className="text-center text-red-400 p-4"><p className="font-semibold">Đã xảy ra lỗi</p><p className="text-sm">{error || videoError}</p></div>)}
                {!isLoading && !error && !videoError && !isVideoLoading && !isPortraitAnimating && !isCurrentRemovingObject && (
                    isRemoveObjectMode && currentRestoredImage ? (<div className="w-full h-full relative"><img ref={imageRef} src={currentRestoredImage} alt="Remove Object" className="w-full h-full object-contain" style={imageStyle} loading="lazy" /></div>) :
                    currentRestoredImage && originalImage && !isRemoveObjectMode ? (
                        comparisonMode === 'slider' ? (<ImageSlider before={originalImage} after={currentRestoredImage} afterStyle={imageStyle} zoom={zoom} loading="lazy" />) : 
                        (<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 w-full h-full p-2">
                            <div className="flex flex-col items-center justify-center h-full"><h4 className="text-sm font-semibold text-slate-300 mb-2 shrink-0">Ảnh gốc</h4><ZoomableImage src={originalImage} alt="Original" zoom={zoom} className="rounded-md" loading="lazy" /></div>
                            <div className="flex flex-col items-center justify-center h-full"><h4 className="text-sm font-semibold text-slate-300 mb-2 shrink-0">Ảnh phục hồi</h4><ZoomableImage src={currentRestoredImage} alt="Restored" zoom={zoom} imgStyle={imageStyle} imgRef={imageRef} className="rounded-md" loading="lazy" /></div>
                        </div>)
                    ) : originalImage ? (<img src={originalImage} alt="Uploaded preview" className="object-contain h-full w-full rounded-lg" loading="lazy" />) : (<div className="text-center text-slate-500"><p>Kết quả sẽ được hiển thị ở đây</p></div>)
                )}
                {currentRestoredImage && !isRemoveObjectMode && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-black/50 backdrop-blur-sm rounded-full flex items-center gap-1 p-1 text-white shadow-lg">
                        <button onClick={handleZoomOut} className="p-2 rounded-full hover:bg-white/20" title="Zoom Out"><ZoomOutIcon className="w-5 h-5" /></button>
                        <button onClick={handleZoomReset} className="px-3 py-1 text-sm font-semibold rounded-full hover:bg-white/20 w-16 text-center" title="Reset Zoom">{Math.round(zoom * 100)}%</button>
                        <button onClick={handleZoomIn} className="p-2 rounded-full hover:bg-white/20" title="Zoom In"><ZoomInIcon className="w-5 h-5" /></button>
                    </div>
                )}
                {restoredImages && restoredImages.length > 1 && !isLoading && !isRemoveObjectMode && (
                    <><button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 z-20"><ChevronLeftIcon className="w-6 h-6" /></button><button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 z-20"><ChevronRightIcon className="w-6 h-6" /></button><div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full z-20">{currentIndex + 1} / {restoredImages.length}</div></>
                )}
            </div>
            {!isRemoveObjectMode && (<div className="flex justify-end mt-2 flex-shrink-0"><div className="flex items-center rounded-md bg-slate-700"><button onClick={() => setComparisonMode('side-by-side')} disabled={!currentRestoredImage || isLoading} className={`p-2 rounded-l-md transition-colors ${comparisonMode === 'side-by-side' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-600 disabled:opacity-50'}`} title="So sánh song song" ><SideBySideIcon className="w-5 h-5" /></button><button onClick={() => setComparisonMode('slider')} disabled={!currentRestoredImage || isLoading} className={`p-2 rounded-r-md transition-colors ${comparisonMode === 'slider' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-600 disabled:opacity-50'}`} title="So sánh dạng trượt" ><SliderIcon className="w-5 h-5" /></button></div></div>)}
        </div>

        {/* --- RIGHT COLUMN: SMART TOOLS PANEL --- */}
        <div className="lg:col-span-4 h-full min-h-[400px] bg-[#1E293B] rounded-xl shadow-lg flex flex-col">
            <div className="flex-shrink-0 border-b border-slate-700 grid grid-cols-3">
                <button onClick={() => setActiveTab('restore')} className={`py-3 text-sm font-semibold border-b-2 ${activeTab === 'restore' ? 'text-cyan-400 border-cyan-400' : 'text-slate-400 border-transparent hover:bg-slate-700/50'}`}>Phục hồi</button>
                <button onClick={() => setActiveTab('adjust')} className={`py-3 text-sm font-semibold border-b-2 ${activeTab === 'adjust' ? 'text-cyan-400 border-cyan-400' : 'text-slate-400 border-transparent hover:bg-slate-700/50'}`}>Tinh chỉnh</button>
                <button onClick={() => setActiveTab('finalize')} className={`py-3 text-sm font-semibold border-b-2 ${activeTab === 'finalize' ? 'text-cyan-400 border-cyan-400' : 'text-slate-400 border-transparent hover:bg-slate-700/50'}`}>Hoàn tất</button>
            </div>
            <div className="flex-grow min-h-0">
                {activeTab === 'restore' && renderRestoreTab()}
                {activeTab === 'adjust' && renderAdjustTab()}
                {activeTab === 'finalize' && renderFinalizeTab()}
            </div>
        </div>
        
        {isRemoveObjectMode && (
          <>
            <canvas ref={canvasRef} className="absolute top-0 left-0 z-30" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={finishDrawing} onMouseLeave={finishDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={finishDrawing} style={{ cursor: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${brushSize}" height="${brushSize}" viewBox="0 0 ${brushSize} ${brushSize}"><circle cx="${brushSize/2}" cy="${brushSize/2}" r="${brushSize/2 - 1}" fill="rgba(255,255,255,0.5)" stroke="%23ff4500" stroke-width="1"/></svg>') ${brushSize/2} ${brushSize/2}, auto` }}/>
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#1E293B]/80 backdrop-blur-sm border border-slate-700 rounded-lg shadow-2xl p-4 flex items-center gap-4">
                <div className='flex flex-col items-center'><label htmlFor="brush-size" className="text-sm text-slate-300 mb-1">Cỡ cọ: {brushSize}px</label><input id="brush-size" type="range" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-32"/></div>
                <button onClick={clearCanvas} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold px-4 py-2 rounded-md transition-colors">Xóa</button>
                <button onClick={() => setIsRemoveObjectMode(false)} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold px-4 py-2 rounded-md transition-colors">Hủy</button>
                <button onClick={handleApplyRemoveObject} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold px-6 py-2 rounded-md transition-colors">Áp dụng</button>
            </div>
          </>
        )}
    </div>
  );
};

export default ResultViewer;