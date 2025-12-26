import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { CloseIcon } from './icons/CloseIcon';
import { mimicImageStyle, generateStyledImageFromPrompt, analyzeImageForConcept } from '../services/geminiService';
import { RotateCwIcon } from './icons/RotateCwIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { LocalUser, addCustomPrompt, getAllCustomPrompts, deleteCustomPrompt, CustomPromptRecord } from '../services/dbService';
import { BookmarkIcon } from './icons/BookmarkIcon';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

interface ImageState {
  id: number;
  file: File;
  dataUrl: string;
  resultUrl: string | null;
  status: 'idle' | 'processing' | 'done' | 'error';
  error: string | null;
  isSelected: boolean;
}

const LIGHTING_EFFECTS = {
  VAY: ["Vệt sáng chéo trên váy", "Ren váy", "Nếp gấp váy", "Gấu váy", "Đuôi váy", "Đèn nến khăn voan", "Ánh sáng xuyên qua khăn voan"],
  MOI_TRUONG: ["Vệt sáng sàn phía trước", "Vệt sáng sàn phía sau", "Vệt sáng cửa sổ trên nền", "Vệt sáng ngang", "Vệt sáng dọc", "Hiệu ứng mành rèm trên nền"]
};

const CONCEPT_PROMPTS = {
  "Em bé": ["Ngọn đồi xanh mướt, bầu trời trong xanh, cây cối um tùm.", "Bên cạnh một hồ nước yên tĩnh, có thuyền gỗ, cây liễu rủ."],
  "Cưới": ["Khu vườn kiểu Anh, có đài phun nước, tượng điêu khắc.", "Con đường mòn trong rừng lá phong mùa thu, lá vàng rơi.", "Trang trại cừu, đồng cỏ, hàng rào gỗ.", "Ruộng bậc thang Sapa, xanh mướt, hùng vĩ.", "Vườn hoa anh đào nở rộ, sắc hồng lãng mạn.", "Ngọn đồi xanh mướt, bầu trời trong xanh, cây cối um tùm.", "Bên cạnh một hồ nước yên tĩnh, có thuyền gỗ, cây liễu rủ.", "Cánh đồng hoa oải hương tím biếc, trải dài đến chân trời.", "Rừng thông Đà Lạt, sương mờ ảo, ánh nắng xiên."],
  "Thời trang": ["Đường phố Sài Gòn xưa, xe cộ tấp nập.", "Bối cảnh Cyberpunk, ánh đèn neon rực rỡ."]
};

const CollapsibleSection: React.FC<{ title: string, children: React.ReactNode, defaultOpen?: boolean, isSubSection?: boolean }> = ({ title, children, defaultOpen = false, isSubSection = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border-b border-slate-700/50 ${isSubSection ? 'bg-slate-900/50 rounded-md border border-slate-700' : ''}`}>
      <button onClick={() => setIsOpen(!isOpen)} className={`w-full flex justify-between items-center font-semibold cursor-pointer p-3 rounded-md transition-colors ${isSubSection ? 'hover:bg-slate-800/50' : ''} ${isOpen ? (isSubSection ? 'bg-slate-800/50' : 'text-cyan-400') : ''}`}>
        <span>{title}</span>
        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className={isSubSection ? "p-3" : "p-3 pt-2"}>{children}</div>}
    </div>
  );
};

interface HackConceptPageProps {
  onNavigateBack: () => void;
  setIsBatchModeActive: (isActive: boolean) => void;
  currentUser: LocalUser;
}

const HackConceptPage: React.FC<HackConceptPageProps> = ({ onNavigateBack, setIsBatchModeActive, currentUser }) => {
  const [images, setImages] = useState<ImageState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState('');
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [negativePrompt, setNegativePrompt] = useState("NSFW, (worst quality:2), (low quality:2), (normal quality:2), lowres, normal quality, ((monochrome)), ((grayscale)), skin spots, acnes, skin blemishes, age spot, (ugly:1.331), (duplicate:1.331), (morbid:1.21), (mutilated:1.21), (tranny:1.331), mutated hands, (poorly drawn hands:1.5), blurry, (bad anatomy:1.21), (bad proportions:1.331), extra limbs, (disfigured:1.331), (missing arms:1.331), (extra legs:1.331), (fused fingers:1.61051), (too many fingers:1.61051), (unclear eyes:1.331), lowers,bad hands, missing fingers, extra digit, bad hands, missing fingers, (((extra arms and legs)))");
  const referenceImageInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzingReference, setIsAnalyzingReference] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  const [savedPrompts, setSavedPrompts] = useState<CustomPromptRecord[]>([]);
  const [isFetchingPrompts, setIsFetchingPrompts] = useState(true);

  const isProcessing = images.some(img => img.status === 'processing');

  useEffect(() => {
    setIsBatchModeActive(true);
    return () => setIsBatchModeActive(false);
  }, [setIsBatchModeActive]);

  const fetchSavedPrompts = useCallback(async () => {
    if (!currentUser.id) return;
    setIsFetchingPrompts(true);
    try {
        const prompts = await getAllCustomPrompts(currentUser.id);
        setSavedPrompts(prompts);
    } catch (err) {
        console.error("Failed to fetch saved prompts:", err);
    } finally {
        setIsFetchingPrompts(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    fetchSavedPrompts();
  }, [fetchSavedPrompts]);

  const handleFilesUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
        const newImagePromises = Array.from(files)
            .filter(file => file.type.startsWith('image/'))
            .map(async (file) => {
                const dataUrl = await fileToBase64(file);
                // Return a temporary object without an ID
                return {
                    file, dataUrl, resultUrl: null,
                    status: 'idle' as const, error: null, isSelected: true,
                };
            });

        const newImagesData = await Promise.all(newImagePromises);

        if (newImagesData.length > 0) {
            setImages(prevImages => {
                const maxId = prevImages.length > 0
                    ? Math.max(...prevImages.map(img => img.id))
                    : -1;

                const newImagesWithIds = newImagesData.map((imgData, index) => ({
                    ...imgData,
                    id: maxId + 1 + index,
                }));

                return [...prevImages, ...newImagesWithIds];
            });
        }
    } catch (error) {
        console.error("Error during file upload:", error);
        alert(`An error occurred while loading files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); }, []);
  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    handleFilesUpload(e.dataTransfer.files);
  }, [handleFilesUpload]);

  const handleToggleSelect = (id: number) => setImages(prev => prev.map(img => img.id === id ? { ...img, isSelected: !img.isSelected } : img));
  const handleSelectAll = () => setImages(prev => prev.map(img => ({ ...img, isSelected: true })));
  const handleDeselectAll = () => setImages(prev => prev.map(img => ({ ...img, isSelected: false })));
  const handleRemoveImage = (id: number) => setImages(prev => prev.filter(img => img.id !== id));
  const handleClearAll = () => {
    if(window.confirm('Bạn có chắc muốn xóa tất cả ảnh?')) {
        setImages([]);
    }
  };
  
  const handleApply = async (imageIdsToProcess?: number[]) => {
    const idsToProcess = imageIdsToProcess || images.filter(img => img.isSelected).map(img => img.id);
    if (idsToProcess.length === 0) return;

    setImages(prev => prev.map(img => idsToProcess.includes(img.id) ? { ...img, status: 'processing', error: null } : img));

    const isMimicMode = !!referenceImageFile;
    const referenceImageBase64 = isMimicMode ? (await fileToBase64(referenceImageFile!)).split(',')[1] : null;
    const referenceImageMime = isMimicMode ? referenceImageFile!.type : null;

    for (const imageId of idsToProcess) {
        const image = images.find(img => img.id === imageId);
        if(!image) continue;
        try {
            const subjectImageBase64 = image.dataUrl.split(',')[1];
            const subjectImageMime = image.file.type;
            let result;

            if (isMimicMode) {
                result = await mimicImageStyle({ data: subjectImageBase64, mimeType: subjectImageMime }, { data: referenceImageBase64!, mimeType: referenceImageMime! });
            } else {
                result = await generateStyledImageFromPrompt(subjectImageBase64, subjectImageMime, prompt);
            }

            if (result.image) {
                setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'done', resultUrl: `data:image/png;base64,${result.image}` } : img));
            } else { throw new Error(result.error || 'API không trả về ảnh'); }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Xử lý thất bại';
            setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'error', error: errorMessage } : img));
        }
    }
  };

  const handleDownloadAllSelected = () => {
    const selectedImages = images.filter(img => img.isSelected && img.resultUrl);
    if (selectedImages.length === 0) {
        alert('Vui lòng chọn ảnh đã xử lý thành công để tải.');
        return;
    }
    selectedImages.forEach((image, index) => {
        setTimeout(() => {
            const link = document.createElement('a');
            link.href = image.resultUrl!;
            link.download = `hack-concept-${image.id}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }, index * 300);
    });
  };

  const handleConceptClick = (conceptPrompt: string) => setPrompt(prev => prev ? `${prev.trim().replace(/[.,]$/, '')}, ${conceptPrompt}` : conceptPrompt);
  
  const handleReferenceImageUpload = (file: File | null) => {
    if (file) {
      setReferenceImageFile(file);
      setAnalysisError(null);
      setIsAnalyzingReference(true);
      setPrompt('Đang phân tích ảnh tham chiếu...');

      const reader = new FileReader();
      reader.onloadend = async () => {
          const url = reader.result as string;
          setReferenceImageUrl(url);

          try {
              const base64Data = url.split(',')[1];
              const mimeType = file.type;
              const result = await analyzeImageForConcept(base64Data, mimeType);
              if (result.prompt) {
                  setPrompt(result.prompt);
              } else if (result.error) {
                  setAnalysisError(result.error);
                  setPrompt('');
              }
          } catch (err) {
              const errorMessage = err instanceof Error ? err.message : "Lỗi phân tích không xác định.";
              setAnalysisError(errorMessage);
              setPrompt('');
          } finally {
              setIsAnalyzingReference(false);
          }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveReferenceImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      setReferenceImageFile(null); 
      setReferenceImageUrl(null);
      setPrompt('');
      setAnalysisError(null);
      if (referenceImageInputRef.current) referenceImageInputRef.current.value = "";
  };

  const handleSavePrompt = async () => {
    if (!prompt.trim() || !currentUser.id) {
        alert("Prompt không được để trống.");
        return;
    }
    try {
        await addCustomPrompt(prompt.trim(), currentUser.id);
        await fetchSavedPrompts(); // Refresh list
        alert("Đã lưu prompt thành công!");
    } catch (err) {
        console.error("Failed to save prompt:", err);
        alert("Lưu prompt thất bại.");
    }
  };

  const handleLoadPrompt = (promptText: string) => {
      setPrompt(promptText);
  };

  const handleDeletePrompt = async (id: number) => {
      if (window.confirm("Bạn có chắc chắn muốn xóa prompt này?")) {
          try {
              await deleteCustomPrompt(id);
              await fetchSavedPrompts(); // Refresh list
          } catch (err) {
              console.error("Failed to delete prompt:", err);
              alert("Xóa prompt thất bại.");
          }
      }
  };
  
  const selectedCount = images.filter(i => i.isSelected).length;

  return (
    <div className="bg-[#10172A] w-full h-full flex flex-col page-enter-animation">
      <header className="flex items-center justify-between p-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-cyan-400">Hack Concept</h1>
        <button onClick={onNavigateBack} className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1 rounded-md text-sm font-semibold transition-colors">
            <ChevronLeftIcon className="w-4 h-4" />
            <span>Quay lại</span>
        </button>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 px-4 pb-4 min-h-0">
        {/* Left Panel */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4 h-full">
            <div className="flex flex-wrap justify-between items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded-md text-sm font-semibold transition-colors">
                        <UploadIcon className="w-5 h-5" />
                        <span>Thêm ảnh</span>
                    </button>
                    {images.length > 0 && (
                        <>
                            <button onClick={handleSelectAll} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-md text-sm font-semibold transition-colors">Chọn tất cả</button>
                            <button onClick={handleDeselectAll} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-md text-sm font-semibold transition-colors">Bỏ chọn tất cả</button>
                            <button onClick={handleClearAll} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-md text-sm font-semibold transition-colors">Xóa tất cả</button>
                            <button onClick={() => handleApply()} disabled={isProcessing || selectedCount === 0} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50">
                                <RotateCwIcon className="w-5 h-5" />
                                <span>Tạo lại ({selectedCount})</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
            <div onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop} className={`flex-grow overflow-y-auto bg-slate-900/50 rounded-lg border-2 ${isDragging ? 'border-cyan-500 bg-slate-800/50' : 'border-slate-800'}`}>
                {images.length === 0 ? (
                     <div onClick={() => fileInputRef.current?.click()} className="flex flex-col h-full items-center justify-center cursor-pointer text-slate-500 hover:text-cyan-400 transition-colors">
                        <UploadIcon className="w-16 h-16" />
                        <p className="mt-4 text-lg font-semibold">Kéo & thả hoặc nhấn để tải ảnh</p>
                        <p className="text-sm">Bắt đầu xử lý hàng loạt</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-4 p-4">
                        {images.map(img => (
                        <div key={img.id} className="relative group aspect-w-3 aspect-h-4 rounded-lg overflow-hidden bg-slate-900 shadow-md">
                            <img src={img.resultUrl || img.dataUrl} alt={`Concept image ${img.id}`} className="w-full h-full object-cover" />
                             <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${img.isSelected ? 'border-cyan-500' : 'border-transparent group-hover:border-slate-600'}`}></div>

                            <div className="absolute top-2 left-2 z-10">
                                <label className="relative flex items-center p-1 rounded-full bg-black/40 cursor-pointer">
                                    <input type="checkbox" checked={img.isSelected} onChange={() => handleToggleSelect(img.id)} className="w-5 h-5 bg-slate-900/50 rounded border-2 border-slate-400 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer" />
                                </label>
                            </div>
                            
                            {(img.status === 'processing' || img.status === 'error') && (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-center p-2 z-20">
                                    {img.status === 'processing' ? (
                                        <div className="flex items-center gap-2 text-slate-200"><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>
                                    ) : ( <div className="text-red-400 text-xs">{img.error}</div> )}
                                </div>
                            )}

                            <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center gap-4 pb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button onClick={() => handleApply([img.id])} className="p-2 bg-slate-700/80 hover:bg-slate-600 rounded-full text-white transition-colors" title="Tạo lại"><RotateCwIcon className="w-4 h-4" /></button>
                                <button className="p-2 bg-slate-700/80 hover:bg-slate-600 rounded-full text-white transition-colors" title="Chuyển tiếp"><ChevronRightIcon className="w-4 h-4" /></button>
                                <button onClick={() => handleRemoveImage(img.id)} className="p-2 bg-slate-700/80 hover:bg-red-500 rounded-full text-white transition-colors" title="Xóa"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        </div>
                        ))}
                    </div>
                )}
                 <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={(e) => handleFilesUpload(e.target.files)} className="hidden" />
            </div>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 h-full">
            <div className="flex justify-end">
                <button onClick={handleDownloadAllSelected} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded-md text-sm font-semibold transition-colors">
                    <DownloadIcon className="w-5 h-5" />
                    <span>Tải tất cả ({selectedCount})</span>
                </button>
            </div>
            <div className="flex-grow bg-[#1E293B] rounded-xl shadow-lg overflow-hidden border border-slate-700 flex flex-col">
                <div className="flex-grow overflow-y-auto">
                    <CollapsibleSection title="Ảnh tham chiếu" defaultOpen>
                    <div onClick={() => !isAnalyzingReference && referenceImageInputRef.current?.click()} className={`relative group flex justify-center items-center p-2 h-32 border-2 border-dashed border-slate-600 rounded-lg text-center text-slate-500 hover:border-cyan-500 ${isAnalyzingReference ? 'cursor-wait' : 'cursor-pointer'}`}>
                        <input ref={referenceImageInputRef} type="file" accept="image/*" onChange={(e) => handleReferenceImageUpload(e.target.files ? e.target.files[0] : null)} className="hidden" disabled={isAnalyzingReference} />
                        {referenceImageUrl ? (
                        <div className="relative w-auto h-full">
                            <img src={referenceImageUrl} alt="Ảnh tham chiếu" className="max-w-full max-h-full object-contain rounded-md" />
                            {!isAnalyzingReference && <button onClick={handleRemoveReferenceImage} className="absolute -top-1 -right-1 bg-black/60 hover:bg-red-500/80 text-white rounded-full p-1 transition-colors" aria-label="Xóa ảnh tham chiếu"><CloseIcon className="w-4 h-4" /></button>}
                        </div>
                        ) : (
                        !isAnalyzingReference && (
                            <div>
                                <UploadIcon className="mx-auto h-6 w-6" />
                                <p className="text-xs mt-1">Kéo thả hoặc nhấn để tải ảnh</p>
                                <p className="text-xs text-slate-600">(Chỉ nhận ảnh kéo một)</p>
                            </div>
                        )
                        )}
                        {isAnalyzingReference && (
                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-lg text-xs text-slate-200">
                                <svg className="animate-spin h-5 w-5 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Đang phân tích...
                            </div>
                        )}
                    </div>
                    {analysisError && <p className="text-xs text-red-400 mt-1">{analysisError}</p>}
                    </CollapsibleSection>

                    <CollapsibleSection title="Prompt của bạn" defaultOpen>
                        <div className="relative">
                            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-cyan-500 pr-10" placeholder="Mô tả concept bạn muốn áp dụng..."></textarea>
                            <div className="absolute top-2 right-2 flex flex-col gap-2">
                                <button className="text-slate-400 hover:text-cyan-400"><MicrophoneIcon className="w-5 h-5" /></button>
                                <button onClick={handleSavePrompt} title="Lưu prompt hiện tại" className="text-slate-400 hover:text-cyan-400"><BookmarkIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Prompts đã lưu">
                        {isFetchingPrompts ? (
                            <p className="text-sm text-slate-400">Đang tải...</p>
                        ) : savedPrompts.length === 0 ? (
                            <p className="text-sm text-slate-400">Chưa có prompt nào được lưu.</p>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {savedPrompts.map(p => (
                                    <div key={p.id} className="group bg-slate-800/50 p-2 rounded-md flex items-center justify-between gap-2">
                                        <p className="text-xs text-slate-300 flex-grow truncate cursor-pointer" onClick={() => handleLoadPrompt(p.promptText)} title={p.promptText}>
                                            {p.promptText}
                                        </p>
                                        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleLoadPrompt(p.promptText)} className="text-xs bg-cyan-600 text-white px-2 py-1 rounded hover:bg-cyan-500">Tải</button>
                                            <button onClick={() => handleDeletePrompt(p.id!)} className="text-red-400 hover:text-red-300 p-1"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CollapsibleSection>

                    <CollapsibleSection title="Hiệu ứng hình ảnh" defaultOpen>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-2">Tùy chọn tiền cảnh</label>
                                <div className="flex justify-around gap-2 text-sm">
                                    <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="foreground" defaultChecked className="accent-cyan-500" /> Tự động</label>
                                    <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="foreground" className="accent-cyan-500" /> Tiền ảnh hoa</label>
                                    <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="foreground" className="accent-cyan-500" /> Tiền cảnh lá xanh</label>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="blur-slider" className="block text-xs font-medium text-slate-400">Độ mờ ống kính (Xóa phông)</label>
                                <input id="blur-slider" type="range" min="1" max="8" defaultValue="4" className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                                <div className="flex justify-between text-xs text-slate-500"><span>f/1.2</span><span>f/2.8</span><span>f/8</span></div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-2">Tùy chọn thời tiết</label>
                                <div className="flex justify-around gap-2 text-sm mb-2">
                                    <label className="flex items-center gap-1.5"><input type="radio" name="weather1" defaultChecked className="accent-cyan-500" /> Không</label>
                                    <label className="flex items-center gap-1.5"><input type="radio" name="weather1" className="accent-cyan-500" /> Nắng nhẹ</label>
                                    <label className="flex items-center gap-1.5"><input type="radio" name="weather1" className="accent-cyan-500" /> Nắng gắt</label>
                                </div>
                                <div className="flex justify-around gap-2 text-sm"><label className="flex items-center gap-1.5"><input type="radio" name="weather2" className="accent-cyan-500" /> Hoàng hôn</label><label className="flex items-center gap-1.5"><input type="radio" name="weather2" className="accent-cyan-500" /> Ban đêm</label></div>
                            </div>
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Hiệu ứng ánh sáng">
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                        <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">VÁY</h5>
                        {LIGHTING_EFFECTS.VAY.map(effect => (<label key={effect} className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" className="accent-cyan-500" defaultChecked={effect === 'Ánh sáng xuyên qua khăn voan'} /> {effect}</label>))}
                        <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wider pt-2">MÔI TRƯỜNG</h5>
                        {LIGHTING_EFFECTS.MOI_TRUONG.map(effect => (<label key={effect} className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" className="accent-cyan-500" /> {effect}</label>))}
                    </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Concept sẵn" defaultOpen>
                    <div className="space-y-2">{Object.entries(CONCEPT_PROMPTS).map(([category, prompts]) => (<CollapsibleSection key={category} title={category} isSubSection defaultOpen={category === "Cưới"}><div className="space-y-2 text-sm text-slate-300 p-2 max-h-48 overflow-y-auto">{prompts.map(p => (<p key={p} onClick={() => handleConceptClick(p)} className="cursor-pointer hover:text-cyan-400 hover:bg-slate-800/50 p-1 rounded-md">{p}</p>))}</div></CollapsibleSection>))}</div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Negative Prompt">
                        <div><textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} rows={5} className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-xs text-slate-400 focus:ring-2 focus:ring-cyan-500" /></div>
                    </CollapsibleSection>
                </div>
                <div className="flex-shrink-0 p-4">
                    <button onClick={() => handleApply()} disabled={isProcessing || selectedCount === 0} className="w-full bg-cyan-500 text-white px-4 py-3 rounded-md text-base font-bold hover:bg-cyan-600 disabled:bg-cyan-800 disabled:text-cyan-400 disabled:cursor-not-allowed flex items-center justify-center">
                        {isProcessing ? 'Đang áp dụng...' : `Áp dụng cho ${selectedCount} ảnh`}
                    </button>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default HackConceptPage;