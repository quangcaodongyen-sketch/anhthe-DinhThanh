import React, { useState, useCallback, useRef } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { UploadIcon } from './icons/UploadIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { restoreDocument } from '../services/geminiService';
import ManualCropModal from './ManualCropModal';

interface DocumentRestorerPageProps {
  onNavigateBack: () => void;
}

const DocumentRestorerPage: React.FC<DocumentRestorerPageProps> = ({ onNavigateBack }) => {
    const [sourceImage, setSourceImage] = useState<{ file: File, url: string } | null>(null);
    const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
    const [restoredImageUrl, setRestoredImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);

    const handleImageUpload = (file: File | null) => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSourceImage({ file, url: reader.result as string });
                setCroppedImageUrl(null);
                setRestoredImageUrl(null);
                setError(null);
                setIsCropModalOpen(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveCroppedImage = (croppedDataUrl: string) => {
        setCroppedImageUrl(croppedDataUrl);
        setRestoredImageUrl(null);
        setIsCropModalOpen(false);
    };

    const handleRestore = async () => {
        if (!croppedImageUrl) {
            setError("Vui lòng tải và cắt ảnh văn bản trước.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setRestoredImageUrl(null);

        try {
            const mimeType = croppedImageUrl.match(/:(.*?);/)?.[1] || 'image/png';
            const data = croppedImageUrl.split(',')[1];
            
            const result = await restoreDocument(data, mimeType);

            if (result.image) {
                setRestoredImageUrl(`data:image/png;base64,${result.image}`);
            } else {
                throw new Error(result.error || 'Phục hồi văn bản thất bại.');
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.';
            setError(`Lỗi: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (restoredImageUrl) {
            const link = document.createElement('a');
            link.href = restoredImageUrl;
            link.download = `restored-document.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    
    const resetUploader = () => {
        if (inputRef.current) {
            inputRef.current.value = "";
        }
        inputRef.current?.click();
    };

    const renderPreview = (title: string, imageUrl: string | null, isLoadingState: boolean, showDownload: boolean = false) => (
        <div className="flex flex-col bg-slate-800 rounded-lg p-3 h-full">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-md font-semibold text-slate-300 text-center">{title}</h4>
                {showDownload && imageUrl && (
                     <button
                        onClick={handleDownload}
                        disabled={!imageUrl}
                        className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        Tải xuống
                    </button>
                )}
            </div>
            <div className={`flex-grow flex items-center justify-center bg-black/20 rounded-md min-h-[300px] relative ${isLoadingState ? 'animate-pulse' : ''}`}>
                {imageUrl ? (
                    <img src={imageUrl} alt={title} className="max-w-full max-h-full object-contain rounded-md" />
                ) : (
                    <div className="text-center text-slate-500 p-4">
                        <p>{isLoadingState ? 'AI đang xử lý...' : 'Kết quả sẽ hiển thị ở đây'}</p>
                    </div>
                )}
                 {isLoadingState && (
                    <div className="absolute inset-0 flex items-center justify-center">
                         <svg className="animate-spin h-8 w-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                 )}
            </div>
        </div>
    );

    const Spinner = () => (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    );

    return (
        <div className="bg-[#10172A] w-full h-full flex flex-col page-enter-animation">
             {isCropModalOpen && sourceImage && (
                <ManualCropModal
                    isOpen={isCropModalOpen}
                    onClose={() => setIsCropModalOpen(false)}
                    imageSrc={sourceImage.url}
                    aspectRatio={0}
                    outputWidthMM={0}
                    outputHeightMM={0}
                    onSave={handleSaveCroppedImage}
                />
            )}
            <header className="flex items-center justify-between p-4 border-b border-slate-800 flex-shrink-0">
                <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-3">
                    <DocumentTextIcon className="w-6 h-6" />
                    Phục hồi Văn bản
                </h2>
                <button onClick={onNavigateBack} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-md text-sm font-semibold">
                    <ChevronLeftIcon className="w-5 h-5" />
                    Quay lại
                </button>
            </header>

            <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 min-h-0 overflow-y-auto">
                {/* Controls */}
                <div className="lg:col-span-4 lg:h-full flex flex-col bg-[#1E293B] p-4 rounded-xl shadow-lg">
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4">1. Tải & Cắt ảnh</h3>
                    {!croppedImageUrl ? (
                         <>
                            <p className="text-sm text-slate-400 mb-2">Ảnh đã được cắt. Bạn có thể chỉnh sửa lại hoặc tiến hành phục hồi.</p>
                            <div
                                onClick={resetUploader}
                                className="relative group flex justify-center items-center w-full min-h-[12rem] border-2 border-dashed rounded-lg cursor-pointer bg-slate-800 border-slate-600 hover:border-cyan-500"
                            >
                                <div className="text-center text-slate-400">
                                    <UploadIcon className="mx-auto h-8 w-8 mb-1" />
                                    <p className="text-sm font-semibold">Nhấn để tải ảnh văn bản</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-400">Ảnh đã được cắt. Bạn có thể chỉnh sửa lại hoặc tiến hành phục hồi.</p>
                            <div className="relative"><img src={croppedImageUrl} alt="Preview" className="w-full rounded-md" /></div>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={resetUploader} className="w-full text-center py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded-md text-sm font-semibold">Tải ảnh khác</button>
                                <button onClick={() => setIsCropModalOpen(true)} className="w-full text-center py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded-md text-sm font-semibold">Cắt lại ảnh</button>
                            </div>
                        </div>
                    )}
                    <input type="file" accept="image/*" ref={inputRef} onChange={(e) => handleImageUpload(e.target.files ? e.target.files[0] : null)} className="hidden" />

                    <div className="mt-auto pt-6 border-t border-slate-700 space-y-4">
                        <h3 className="text-lg font-semibold text-cyan-400">2. Phục hồi hình ảnh</h3>
                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                        <button onClick={handleRestore} disabled={!croppedImageUrl || isLoading} className="w-full bg-cyan-500 text-white px-4 py-3 rounded-md text-base font-bold hover:bg-cyan-600 disabled:bg-cyan-800 disabled:text-cyan-400 disabled:cursor-not-allowed flex items-center justify-center">
                            {isLoading ? <><Spinner /><span>Đang phục hồi...</span></> : 'Phục hồi hình ảnh'}
                        </button>
                    </div>
                </div>

                {/* Image Previews */}
                 <div className="lg:col-span-8 lg:h-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {renderPreview('Ảnh đã cắt', croppedImageUrl, false)}
                    {renderPreview('Văn bản đã phục hồi', restoredImageUrl, isLoading, true)}
                </div>

            </main>
        </div>
    );
};

export default DocumentRestorerPage;