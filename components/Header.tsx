import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-slate-900/50 backdrop-blur-sm sticky top-0 z-20 border-b border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <div className="text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-cyan-400">
            Ảnh thẻ - khôi phục ảnh Đinh Thành
          </h1>
          <p className="mt-1 text-slate-300 text-sm">
            Phục hồi ảnh chuyên nghiệp
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;