import React from 'react';
import { DownloadIcon } from './icons/DownloadIcon';
import { SendIcon } from './icons/SendIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';

interface UpscalerPageProps {
  imageToUpscale: string | null;
  onNavigateBack: () => void;
}

const UpscalerPage: React.FC<UpscalerPageProps> = ({ imageToUpscale, onNavigateBack }) => {

  const handleDownload = () => {
    if (imageToUpscale) {
      const link = document.createElement('a');
      link.href = imageToUpscale;
      link.download = `restored-photo-for-upscaling.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="bg-[#1E293B] p-4 rounded-xl shadow-lg h-full flex flex-col page-enter-animation overflow-y-auto">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-xl font-semibold text-cyan-400">Nâng cấp ảnh bằng công cụ bên thứ 3</h3>
        <button 
          onClick={onNavigateBack}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-md text-sm font-semibold transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5" />
          Quay lại
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow">
        {/* Left side: Image Preview */}
        <div className="flex flex-col bg-slate-800 rounded-lg p-4">
          <h4 className="text-md font-semibold text-slate-300 mb-4 text-center">Ảnh đã phục hồi</h4>
          <div className="flex-grow flex items-center justify-center min-h-[300px]">
            {imageToUpscale ? (
              <img 
                src={imageToUpscale} 
                alt="Restored" 
                className="max-w-full max-h-full object-contain rounded-md"
                loading="lazy"
              />
            ) : (
              <div className="text-center text-slate-500 p-8">
                <p className="font-semibold text-lg">Không có ảnh nào được chọn</p>
                <p className="mt-2">Vui lòng quay lại trang phục hồi, xử lý một ảnh và nhấn "Gửi tới trang nâng cấp ảnh".</p>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Instructions */}
        <div className="flex flex-col bg-slate-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-slate-300 mb-4">Hướng dẫn nâng cấp ảnh</h4>
          <p className="text-slate-400 mb-6">
            Chúng tôi sử dụng dịch vụ miễn phí và mạnh mẽ từ <strong className="text-cyan-400">imgupscaler.ai</strong> để nâng cấp ảnh lên độ phân giải siêu cao (lên đến 16K). Vui lòng làm theo các bước sau:
          </p>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-cyan-500 text-white rounded-full h-8 w-8 flex-shrink-0 flex items-center justify-center font-bold text-lg">1</div>
              <div className="flex-grow">
                <h5 className="font-semibold text-slate-200">Tải ảnh về máy</h5>
                <p className="text-sm text-slate-400 mt-1">Lưu ảnh đã phục hồi vào máy tính hoặc điện thoại của bạn.</p>
                <button
                  onClick={handleDownload}
                  disabled={!imageToUpscale}
                  className="mt-3 w-full sm:w-auto bg-slate-700 text-slate-200 px-4 py-2 rounded-md text-sm font-semibold hover:bg-slate-600 transition-colors disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <DownloadIcon className="w-5 h-5" />
                  Tải ảnh
                </button>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-cyan-500 text-white rounded-full h-8 w-8 flex-shrink-0 flex items-center justify-center font-bold text-lg">2</div>
              <div className="flex-grow">
                <h5 className="font-semibold text-slate-200">Mở trang nâng cấp ảnh</h5>
                <p className="text-sm text-slate-400 mt-1">Một tab mới sẽ mở ra trang web của ImgUpscaler AI.</p>
                <a
                  href="https://imgupscaler.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 w-full sm:w-auto bg-cyan-500 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2"
                >
                  <SendIcon className="w-5 h-5" />
                  Mở ImgUpscaler.ai
                </a>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-cyan-500 text-white rounded-full h-8 w-8 flex-shrink-0 flex items-center justify-center font-bold text-lg">3</div>
               <div className="flex-grow">
                <h5 className="font-semibold text-slate-200">Tải ảnh lên và xử lý</h5>
                <p className="text-sm text-slate-400 mt-1">Trên trang ImgUpscaler, tìm nút "Upload" hoặc "Drag & Drop", sau đó chọn file ảnh bạn vừa tải ở Bước 1 để bắt đầu quá trình nâng cấp.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpscalerPage;