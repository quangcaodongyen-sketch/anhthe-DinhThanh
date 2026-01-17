import React, { useState, useEffect } from 'react';
import ApiKeyModal from './ApiKeyModal';

const Header: React.FC = () => {
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [hasKey, setHasKey] = useState(true);

  useEffect(() => {
    const checkKey = () => {
        const key = localStorage.getItem('GEMINI_API_KEY');
        const exists = !!(key && key.trim() !== "");
        setHasKey(exists);
        if (!exists) {
            // Tự động mở modal nếu lần đầu vào app chưa có key
            setIsApiModalOpen(true);
        }
    };
    checkKey();
    
    // Lắng nghe sự kiện storage để cập nhật UI khi key thay đổi ở tab khác hoặc modal
    window.addEventListener('storage', checkKey);
    return () => window.removeEventListener('storage', checkKey);
  }, []);

  return (
    <header className="bg-slate-900/50 backdrop-blur-sm sticky top-0 z-[60] border-b border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <div className="text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-cyan-400">
            Ảnh thẻ - khôi phục ảnh Đinh Thành
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
             <p className="text-slate-300 text-sm">Phục hồi ảnh chuyên nghiệp</p>
             <a 
                href="https://tinyurl.com/hdsdpmTHT" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-500 hover:text-cyan-400 text-xs font-semibold underline flex items-center gap-1"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Xem hướng dẫn sử dụng
             </a>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            {!hasKey && (
                <span className="text-[10px] sm:text-xs font-bold text-red-500 animate-pulse mb-1">
                   Lấy API key để sử dụng app
                </span>
            )}
            <button 
                onClick={() => setIsApiModalOpen(true)}
                className={`group relative flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all shadow-lg ${
                    !hasKey 
                    ? 'bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/20 shadow-red-500/10' 
                    : 'bg-slate-800 border-slate-700 text-yellow-500 hover:border-yellow-500 shadow-yellow-500/5'
                }`}
                title="Cấu hình API Key Gemini"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3m-3-3l-2.25-2.25"/>
                </svg>
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Cấu hình API</span>
                
                {!hasKey && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                )}
            </button>
          </div>
        </div>
      </div>
      
      <ApiKeyModal 
        isOpen={isApiModalOpen} 
        onClose={() => {
            setIsApiModalOpen(false);
            // Kích hoạt lại việc kiểm tra key để cập nhật Header
            const key = localStorage.getItem('GEMINI_API_KEY');
            setHasKey(!!(key && key.trim() !== ""));
        }} 
      />
    </header>
  );
};

export default Header;