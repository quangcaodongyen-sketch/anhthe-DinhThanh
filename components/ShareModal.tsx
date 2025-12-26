import React from 'react';
import { DownloadIcon } from './icons/DownloadIcon';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageToShare: string | null;
  onDownload: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, imageToShare, onDownload }) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1E293B] rounded-lg shadow-2xl p-6 relative w-full max-w-sm border border-slate-700 text-center"
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 h-8 w-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors z-10"
          aria-label="Đóng"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h3 className="text-xl font-bold text-cyan-400 mb-4">Chia sẻ ảnh</h3>

        {imageToShare && (
          <div className="mb-4 rounded-md overflow-hidden bg-slate-800 p-2">
            <img src={imageToShare} alt="Preview for sharing" className="max-h-48 w-auto mx-auto rounded" loading="lazy" />
          </div>
        )}

        <p className="text-sm text-slate-300 mb-6">
          Trình duyệt của bạn không hỗ trợ chia sẻ trực tiếp. Vui lòng tải ảnh về máy và chia sẻ thủ công.
        </p>

        <button
          onClick={() => {
            onDownload();
            onClose();
          }}
          className="w-full bg-cyan-500 text-white px-4 py-3 rounded-md text-base font-bold hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2"
        >
          <DownloadIcon className="w-5 h-5" />
          Tải ảnh về máy
        </button>
      </div>
    </div>
  );
};

export default ShareModal;
