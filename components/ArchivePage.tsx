import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { TrashIcon } from './icons/TrashIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { SendIcon } from './icons/SendIcon';
// FIX: Add LocalUser to imports and pass userId to getAllImages
import { getAllImages, deleteImage, ArchivedImage, LocalUser } from '../services/dbService';

interface ArchivePageProps {
  onNavigateBack: () => void;
  onLoadImage: (imageDataUrl: string) => void;
  currentUser: LocalUser;
}

const ArchivePage: React.FC<ArchivePageProps> = ({ onNavigateBack, onLoadImage, currentUser }) => {
  const [images, setImages] = useState<ArchivedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    if (!currentUser?.id) {
        setError("Không có thông tin người dùng.");
        setLoading(false);
        return;
    }
    setLoading(true);
    setError(null);
    try {
      // FIX: Pass the userId to getAllImages
      const storedImages = await getAllImages(currentUser.id);
      setImages(storedImages);
    } catch (err) {
      console.error("Failed to load images from DB:", err);
      setError("Không thể tải thư viện ảnh. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleDelete = async (id: number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa ảnh này khỏi thư viện không?")) {
      try {
        await deleteImage(id);
        setImages(prevImages => prevImages.filter(img => img.id !== id));
      } catch (err) {
        console.error("Failed to delete image:", err);
        setError("Xóa ảnh thất bại.");
      }
    }
  };
  
  const handleDownload = (image: ArchivedImage) => {
      const link = document.createElement('a');
      link.href = image.imageDataUrl; // Use full-res image for download
      link.download = `archive-${image.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleUseImage = (image: ArchivedImage) => {
    onLoadImage(image.originalImageUrl); // Use original image for re-editing
  };


  return (
    <div className="bg-[#10172A] w-full h-full flex flex-col page-enter-animation">
      <header className="flex items-center justify-between p-4 border-b border-slate-800 flex-shrink-0">
        <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-3">
            <BookOpenIcon className="w-6 h-6" />
            Thư viện ảnh đã lưu
        </h2>
        <button onClick={onNavigateBack} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-md text-sm font-semibold transition-colors">
          <ChevronLeftIcon className="w-5 h-5" />
          Quay lại
        </button>
      </header>

      <main className="flex-grow p-4 overflow-y-auto">
        {loading && (
          <div className="flex justify-center items-center h-full">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {error && <div className="text-center text-red-400 p-4">{error}</div>}
        {!loading && !error && images.length === 0 && (
          <div className="text-center text-slate-500 flex flex-col items-center justify-center h-full">
            <BookOpenIcon className="w-16 h-16 mb-4 text-slate-600" />
            <h3 className="text-xl font-semibold text-slate-400">Thư viện của bạn đang trống</h3>
            <p className="mt-2 max-w-md">Sau khi phục hồi ảnh, hãy nhấn nút "Lưu trữ" để thêm ảnh vào đây và xem lại sau.</p>
          </div>
        )}
        {!loading && !error && images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {images.map(image => (
              <div key={image.id} className="group relative bg-slate-800 rounded-lg overflow-hidden shadow-lg aspect-w-1 aspect-h-1">
                <img src={image.thumbnailDataUrl} alt={`Archived image ${image.id}`} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                  <div className="text-xs text-slate-400">
                    Lưu lúc: {new Date(image.timestamp).toLocaleString()}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => handleDownload(image)} title="Tải xuống" className="bg-slate-600/80 hover:bg-cyan-500 text-white rounded-full p-2 transition-colors">
                      <DownloadIcon className="w-5 h-5" />
                    </button>
                     <button onClick={() => handleUseImage(image)} title="Sử dụng lại ảnh này" className="bg-slate-600/80 hover:bg-green-500 text-white rounded-full p-2 transition-colors">
                      <SendIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(image.id)} title="Xóa ảnh" className="bg-slate-600/80 hover:bg-red-500 text-white rounded-full p-2 transition-colors">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ArchivePage;
