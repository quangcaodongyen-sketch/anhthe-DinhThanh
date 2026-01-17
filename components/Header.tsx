import React, { useState } from 'react';
import ApiKeyModal from './ApiKeyModal';

const Header: React.FC = () => {
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);

  return (
    <header className="bg-slate-900/50 backdrop-blur-sm sticky top-0 z-[60] border-b border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <div className="text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-cyan-400">
            Ảnh thẻ - khôi phục ảnh Đinh Thành
          </h1>
          <p className="mt-1 text-slate-300 text-sm">
            Phục hồi ảnh chuyên nghiệp
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsApiModalOpen(true)}
            className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-slate-700 hover:border-yellow-500 transition-all text-yellow-500 shadow-lg hover:shadow-yellow-500/20"
            title="Cấu hình API Key Gemini"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3m-3-3l-2.25-2.25"/>
            </svg>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
            </span>
          </button>
        </div>
      </div>
      
      <ApiKeyModal isOpen={isApiModalOpen} onClose={() => setIsApiModalOpen(false)} />
    </header>
  );
};

export default Header;