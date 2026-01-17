import React, { useState, useEffect } from 'react';
import { CloseIcon } from './icons/CloseIcon';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('GEMINI_API_KEY') || '';
      setKey(savedKey);
      setStatus('idle');
    }
  }, [isOpen]);

  const handleSave = () => {
    if (key.trim()) {
      localStorage.setItem('GEMINI_API_KEY', key.trim());
      setStatus('saved');
      setTimeout(() => {
        onClose();
      }, 800);
    } else {
      localStorage.removeItem('GEMINI_API_KEY');
      onClose();
    }
  };

  const handleClear = () => {
    setKey('');
    localStorage.removeItem('GEMINI_API_KEY');
    setStatus('idle');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
      <div className="bg-[#1E293B] rounded-xl shadow-2xl w-full max-w-md border border-slate-700 overflow-hidden">
        <header className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
          <h2 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3m-3-3l-2.25-2.25"/></svg>
            Cấu hình API Key Gemini
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><CloseIcon className="w-6 h-6" /></button>
        </header>
        
        <div className="p-6 space-y-4">
          <div className="bg-blue-900/30 border border-blue-700/50 p-3 rounded-lg text-sm text-blue-200">
            <p>Sử dụng API Key cá nhân để được tạo ảnh miễn phí và không bị giới hạn bởi hệ thống.</p>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block mt-2 text-cyan-400 font-bold hover:underline"
            >
              Lấy API Key Miễn Phí Tại Đây →
            </a>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Dán API Key của bạn:</label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all font-mono"
            />
          </div>

          <p className="text-[10px] text-slate-500 italic text-center">
            * Lưu ý: API Key được lưu trực tiếp trên trình duyệt của bạn và chỉ được gửi tới Google. Chúng tôi không lưu trữ key này trên server.
          </p>
        </div>

        <footer className="flex justify-between gap-3 p-4 bg-slate-800/30 border-t border-slate-700">
          <button 
            onClick={handleClear}
            className="text-slate-400 hover:text-red-400 text-sm font-semibold transition-colors"
          >
            Xóa Key hiện tại
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="bg-slate-700 text-slate-200 px-4 py-2 rounded-md text-sm font-semibold hover:bg-slate-600">Đóng</button>
            <button 
              onClick={handleSave} 
              className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${status === 'saved' ? 'bg-green-600 text-white' : 'bg-cyan-500 text-white hover:bg-cyan-600'}`}
            >
              {status === 'saved' ? 'Đã Lưu!' : 'Lưu Cấu Hình'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ApiKeyModal;