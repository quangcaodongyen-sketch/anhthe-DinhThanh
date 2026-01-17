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
    const trimmedKey = key.trim();
    if (trimmedKey) {
      localStorage.setItem('GEMINI_API_KEY', trimmedKey);
      // Phát sự kiện storage cho chính tab hiện tại
      window.dispatchEvent(new Event('storage'));
      setStatus('saved');
      setTimeout(() => {
        onClose();
      }, 800);
    } else {
      localStorage.removeItem('GEMINI_API_KEY');
      window.dispatchEvent(new Event('storage'));
      onClose();
    }
  };

  const handleClear = () => {
    setKey('');
    localStorage.removeItem('GEMINI_API_KEY');
    window.dispatchEvent(new Event('storage'));
    setStatus('idle');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fadeIn">
      <div className="bg-[#1E293B] rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 overflow-hidden ring-1 ring-white/10">
        <header className="flex items-center justify-between p-5 border-b border-slate-700 bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/20 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3m-3-3l-2.25-2.25"/></svg>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Cấu hình API Key</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-all p-1 hover:bg-slate-700 rounded-full"><CloseIcon className="w-6 h-6" /></button>
        </header>
        
        <div className="p-6 space-y-6">
          <div className="bg-cyan-900/20 border border-cyan-700/50 p-4 rounded-xl text-sm text-cyan-100 flex flex-col gap-3">
            <p className="font-semibold text-cyan-400">Ứng dụng yêu cầu API Key Gemini để hoạt động.</p>
            <p className="text-xs opacity-90 leading-relaxed italic">
              * Key này hoàn toàn miễn phí từ Google. Khi hết giới hạn (quota) trong ngày, bạn có thể tạo Key mới để tiếp tục dùng.
            </p>
            
            <div className="flex flex-col gap-2 pt-2">
                <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full text-center py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-lg transition-all text-xs uppercase tracking-wide"
                >
                1. Lấy API Key Miễn Phí Tại Đây
                </a>
                <a 
                href="https://tinyurl.com/hdsdpmTHT" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-center text-cyan-400 hover:underline text-[11px] font-medium"
                >
                2. Xem video hướng dẫn cách lấy key
                </a>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 ml-1">Dán mã API Key của bạn:</label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIzaSyB..."
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all font-mono placeholder:text-slate-600 shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2 px-1 text-[11px] text-slate-500">
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
             <span>Key được lưu an toàn tại trình duyệt của bạn (LocalStorage).</span>
          </div>
        </div>

        <footer className="flex justify-between items-center gap-3 p-5 bg-slate-800/40 border-t border-slate-700">
          <button 
            onClick={handleClear}
            className="text-slate-500 hover:text-red-400 text-sm font-medium transition-colors"
          >
            Xóa Key
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all">Đóng</button>
            <button 
              onClick={handleSave} 
              className={`px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg transform active:scale-95 transition-all ${status === 'saved' ? 'bg-green-600 text-white' : 'bg-cyan-500 text-white hover:bg-cyan-400 hover:shadow-cyan-500/20'}`}
            >
              {status === 'saved' ? 'Đã Lưu!' : 'Lưu Cấu Hình'}
            </button>
          </div>
        </footer>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default ApiKeyModal;