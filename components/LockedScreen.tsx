import React from 'react';
import { ZaloIcon } from './icons/ZaloIcon';
import { FacebookIcon } from './icons/FacebookIcon';

const LockedScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-gradient-to-b from-[#10172A] to-[#075985]">
      <div className="bg-[#1E293B] p-8 rounded-xl shadow-lg w-full max-w-md border border-red-700 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
        </svg>
        <h2 className="text-2xl font-bold text-center text-red-400 mt-4">
          Giấy phép đã bị vô hiệu hóa
        </h2>
        <p className="text-center text-slate-300 mt-4">
          Phát hiện hành vi gian lận: Giấy phép này đã được sao chép và sử dụng trên một máy tính khác.
        </p>
        <p className="text-center text-slate-400 mt-2">
          Tài khoản đã bị <strong>khóa vĩnh viễn</strong>.
        </p>
        <div className="mt-6 text-center text-sm text-slate-400 border-t border-slate-700 pt-4">
            <p className="mb-3">Vui lòng liên hệ admin để được hỗ trợ giải quyết:</p>
            <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <ZaloIcon className="w-6 h-6" />
                  <span className="font-semibold text-slate-200 text-base">0915213717</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LockedScreen;