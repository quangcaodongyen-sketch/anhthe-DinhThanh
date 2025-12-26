
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { CameraIcon } from './icons/CameraIcon';
import { CloseIcon } from './icons/CloseIcon';

// A self-contained component for the camera capture modal
const CameraCapture: React.FC<{
  onClose: () => void;
  onCapture: (file: File) => void;
}> = ({ onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      setError(null);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Trình duyệt này không hỗ trợ chụp ảnh.");
        return;
      }

      try {
        let stream: MediaStream;
        try {
            // First attempt: Ideal settings (Front camera, Full HD)
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'user', 
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                } 
            });
        } catch (err) {
            console.warn("High quality camera request failed, retrying with defaults...", err);
            // Second attempt: Fallback to basic settings (Any available camera)
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setError("Quyền truy cập camera bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt (biểu tượng ổ khóa trên thanh địa chỉ).");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            setError("Không tìm thấy thiết bị camera.");
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            setError("Camera đang được sử dụng bởi ứng dụng khác hoặc bị lỗi phần cứng.");
        } else {
            setError("Không thể khởi động camera. Vui lòng thử tải ảnh lên từ máy.");
        }
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL('image/jpeg'));
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleUsePhoto = () => {
    if (capturedImage) {
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
        });
    }
  };


  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4" role="dialog" aria-modal="true">
      <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black/30 rounded-full p-2 hover:bg-black/60" aria-label="Đóng camera">
        <CloseIcon className="w-6 h-6" />
      </button>

      <div className="w-full h-full max-w-4xl max-h-[85vh] flex items-center justify-center relative">
        {error ? (
          <div className="text-center text-red-400 bg-slate-900 p-6 rounded-lg max-w-md border border-slate-700">
            <h3 className="text-lg font-bold mb-2 text-red-500">Lỗi Camera</h3>
            <p className="mb-4">{error}</p>
            <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-md transition-colors">Đóng</button>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-contain ${capturedImage ? 'hidden' : ''}`}></video>
            {capturedImage && <img src={capturedImage} alt="Ảnh đã chụp" className="w-full h-full object-contain" loading="lazy" />}
          </>
        )}
      </div>

      {!error && (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center gap-8 w-full pointer-events-none">
        <div className="pointer-events-auto">
            {capturedImage ? (
            <div className="flex gap-4">
                <button onClick={handleRetake} className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-6 py-3 rounded-lg shadow-lg">Chụp lại</button>
                <button onClick={handleUsePhoto} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold px-8 py-3 rounded-lg shadow-lg">Sử dụng ảnh</button>
            </div>
            ) : (
            <button onClick={handleCapture} className="w-20 h-20 rounded-full bg-white/30 border-4 border-white ring-4 ring-black/30 hover:bg-white/50 transition-colors shadow-lg" aria-label="Chụp ảnh"></button>
            )}
        </div>
      </div>
      )}
    </div>
  );
};


interface ImageUploaderProps {
  onImageUpload: (file: File | null) => void;
  previewUrl: string | null;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  previewUrl,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onImageUpload(file);
      } else {
        alert("Vui lòng tải lên định dạng ảnh hợp lệ (jpg, png, webp).");
        onImageUpload(null);
      }
    } else {
      onImageUpload(null);
    }
  }, [onImageUpload]);
  
  const handlePhotoCaptured = (file: File) => {
    onImageUpload(file);
    setIsCameraOpen(false);
  };

  const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
    }
  }, [handleFileChange]);

  const handleAreaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    inputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAreaClick(e as any);
    }
  };

  return (
    <>
      <div className="w-full">
        <div
          onClick={handleAreaClick}
          onKeyDown={handleKeyDown}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          className={`relative group flex justify-center items-center w-full h-40 sm:h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#1E293B]
          ${isDragging ? 'border-cyan-400 bg-slate-700/50' : 'border-slate-600 hover:border-cyan-500 bg-slate-800'}`}
          role="button"
          aria-label={previewUrl ? "Thay đổi ảnh đã tải lên" : "Tải ảnh lên"}
          tabIndex={0}
        >
          {previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt="Preview"
                className="object-contain h-full w-full rounded-lg"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <button onClick={handleAreaClick} className="bg-slate-100 text-slate-800 font-semibold px-4 py-2 rounded-lg shadow-md flex items-center gap-2 pointer-events-auto hover:bg-white">
                      <UploadIcon className="w-5 h-5" />
                      <span>Tải ảnh khác</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setIsCameraOpen(true); }} className="bg-slate-100 text-slate-800 font-semibold px-4 py-2 rounded-lg shadow-md flex items-center gap-2 pointer-events-auto hover:bg-white">
                      <CameraIcon className="w-5 h-5" />
                      <span>Chụp ảnh mới</span>
                  </button>
              </div>
            </>
          ) : (
            <div className="text-center text-slate-400 pointer-events-none">
              <UploadIcon className="mx-auto h-10 w-10 mb-2" />
              <p className="font-semibold">Kéo & thả hoặc nhấn để tải ảnh</p>
              <div className="text-sm text-slate-500 my-2 relative pointer-events-auto">
                hoặc
              </div>
              <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsCameraOpen(true);
                }}
                className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1 rounded-md text-xs font-semibold transition-colors pointer-events-auto border border-slate-600"
                >
                <CameraIcon className="w-4 h-4" />
                Chụp ảnh từ Camera
              </button>
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={(e) => handleFileChange(e.target.files)}
        />
      </div>
      {isCameraOpen && <CameraCapture onClose={() => setIsCameraOpen(false)} onCapture={handlePhotoCaptured} />}
    </>
  );
};

export default ImageUploader;
