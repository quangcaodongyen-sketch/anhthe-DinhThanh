// Fix: Implemented the VideoModal component to replace placeholder content. This resolves module import errors and provides the UI for video playback.
import React, { useEffect, useRef } from 'react';

interface VideoModalProps {
  videoUrl: string;
  onClose: () => void;
}

const VideoModal: React.FC<VideoModalProps> = ({ videoUrl, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && event.target === modalRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={modalRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300 animate-fadeIn"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-[#1E293B] rounded-lg shadow-2xl p-4 relative w-full max-w-md animate-scaleUp">
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 h-8 w-8 bg-slate-700 rounded-full flex items-center justify-center text-white hover:bg-slate-600 transition-colors z-10"
          aria-label="Close video player"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="w-full">
          <video
            src={videoUrl}
            controls
            autoPlay
            loop
            className="w-full h-full rounded-md"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scaleUp { animation: scaleUp 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default VideoModal;