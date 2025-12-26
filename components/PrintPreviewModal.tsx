import React from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationIcon } from './icons/ExclamationIcon';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  previewImage: string | null;
  paperName: string;
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ isOpen, onClose, onPrint, previewImage, paperName }) => {
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
        className="bg-[#1E293B] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] border border-slate-700 flex flex-col"
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-cyan-400">Xem trước & Hướng dẫn In</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><CloseIcon className="w-6 h-6" /></button>
        </header>

        <main className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 p-6 min-h-0 overflow-y-auto">
          {/* Instructions Column */}
          <div className="flex flex-col gap-6">
            <h3 className="text-lg font-semibold text-slate-200">Vui lòng làm theo các bước sau trong cửa sổ in:</h3>
            
            <div className="flex items-start gap-3">
              <div className="bg-cyan-500 text-white rounded-full h-8 w-8 flex-shrink-0 flex items-center justify-center font-bold text-lg">1</div>
              <div>
                <h4 className="font-semibold text-slate-200">Chọn đúng Khổ giấy</h4>
                <p className="text-sm text-slate-400 mt-1">
                  Trong mục "Paper size", hãy chắc chắn bạn đã chọn: <strong className="text-cyan-400">{paperName}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-amber-900/50 border border-amber-700 rounded-lg">
                <ExclamationIcon className="w-8 h-8 text-amber-400 flex-shrink-0" />
                <div>
                    <h4 className="font-bold text-amber-300">Cực kỳ quan trọng: Tỷ lệ 100%</h4>
                    <p className="text-sm text-amber-300 mt-1">
                    Để ảnh in ra đúng kích thước vật lý, trong mục "Scale", hãy chọn <strong className="underline">100%</strong> hoặc <strong className="underline">"Actual size"</strong>.
                    </p>
                    <p className="text-sm text-amber-300 mt-2 font-semibold">
                    TUYỆT ĐỐI KHÔNG chọn "Fit to page" (Vừa với trang).
                    </p>
                </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-cyan-500 text-white rounded-full h-8 w-8 flex-shrink-0 flex items-center justify-center font-bold text-lg">3</div>
              <div>
                <h4 className="font-semibold text-slate-200">Chọn Lề (Margins)</h4>
                <p className="text-sm text-slate-400 mt-1">
                  Chọn lề là <strong>"None" (Không có)</strong> hoặc <strong>"Default" (Mặc định)</strong>. Ứng dụng đã tự động căn lề giúp bạn.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-slate-200">Sẵn sàng!</h4>
                <p className="text-sm text-slate-400 mt-1">
                  Khi đã kiểm tra xong các cài đặt, hãy nhấn nút "Tiến hành In" bên dưới.
                </p>
              </div>
            </div>
          </div>

          {/* Preview Column */}
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-slate-200 mb-2 text-center">Bản xem trước</h3>
            <div className="flex-grow flex items-center justify-center bg-slate-900/50 rounded-lg p-2 min-h-[300px]">
              {previewImage ? (
                <img src={previewImage} alt="Print Preview" className="max-w-full max-h-full object-contain shadow-lg" />
              ) : (
                <p className="text-slate-500">Đang tải bản xem trước...</p>
              )}
            </div>
          </div>
        </main>

        <footer className="flex-shrink-0 flex items-center justify-end gap-3 p-4 bg-slate-800/50 border-t border-slate-700">
          <button onClick={onClose} className="bg-slate-600 text-slate-200 px-4 py-2 rounded-md text-sm font-semibold hover:bg-slate-500">Hủy</button>
          <button onClick={onPrint} className="bg-cyan-500 text-white px-6 py-2 rounded-md text-sm font-bold hover:bg-cyan-600">Tiến hành In</button>
        </footer>
      </div>
    </div>
  );
};

export default PrintPreviewModal;