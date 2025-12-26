import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createIDPhoto } from '../services/geminiService';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { UploadIcon } from './icons/UploadIcon';
import { CameraIcon } from './icons/CameraIcon';
import { TuneIcon } from './icons/TuneIcon';
import { LayoutIcon } from './icons/LayoutIcon';
import ManualCropModal from './ManualCropModal';
import { DownloadIcon } from './icons/DownloadIcon';
import { UserPlusIcon } from './icons/UserPlusIcon';
import type { LayoutImage } from './PrintLayoutPage';
// FIX: Import LocalUser type to use for the currentUser prop
import type { LocalUser } from '../services/dbService';

// Clothing Icons
import { NoSymbolIcon } from './icons/NoSymbolIcon';
import { ShirtIcon } from './icons/ShirtIcon';
import { SuitIcon } from './icons/SuitIcon';
import { PoliceCapIcon } from './icons/PoliceCapIcon';
import { DoctorCoatIcon } from './icons/DoctorCoatIcon';
import { GraduationCapIcon } from './icons/GraduationCapIcon';
import { AoDaiIcon } from './icons/AoDaiIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';

// Helper to convert File/Blob to Base64
const fileToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const dataURLtoFile = (dataurl: string, filename: string): File | null => {
    const arr = dataurl.split(',');
    if (arr.length < 2) {
        return null;
    }
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        return null;
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

const createThumbnail = (imageDataUrl: string, maxWidth: number = 256): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imageDataUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = Math.min(maxWidth / img.width, 1);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
    });
};


const CLOTHING_OPTIONS = [
  { id: 'none', name: 'Giữ nguyên', icon: NoSymbolIcon, prompt: 'none' },
  { id: 'shirt', name: 'Áo sơ mi', icon: ShirtIcon, prompt: 'áo sơ mi trắng công sở lịch sự' },
  { id: 'suit', name: 'Áo vest', icon: SuitIcon, prompt: 'áo vest đen chuyên nghiệp với sơ mi trắng' },
  { id: 'police', name: 'C.An/Q.Đội', icon: PoliceCapIcon, prompt: 'trang phục công an nhân dân Việt Nam' },
  { id: 'doctor', name: 'Bác sĩ', icon: DoctorCoatIcon, prompt: 'áo blouse trắng của bác sĩ' },
  { id: 'graduation', name: 'Tốt nghiệp', icon: GraduationCapIcon, prompt: 'áo cử nhân tốt nghiệp' },
  { id: 'aodai', name: 'Áo dài', icon: AoDaiIcon, prompt: 'áo dài truyền thống Việt Nam' },
  { id: 'student_red_scarf', name: 'HS Khăn đỏ', icon: ShirtIcon, prompt: 'áo sơ mi trắng đồng phục học sinh tiểu học Việt Nam có đeo khăn quàng đỏ' }
];

const CROP_PRESETS = [
    { name: 'Kích thước thẻ phổ thông', sizes: ['2x3', '3x4', '4x6'] },
    { name: 'Visa & Hộ chiếu', sizes: ['visa_us', 'visa_eu', 'passport_vn'] },
];

const CROP_DEFINITIONS = {
    '2x3': { name: '2x3 cm', aspectRatio: 2 / 3, widthMM: 20, heightMM: 30 },
    '3x4': { name: '3x4 cm', aspectRatio: 3 / 4, widthMM: 30, heightMM: 40 },
    '4x6': { name: '4x6 cm', aspectRatio: 4 / 6, widthMM: 40, heightMM: 60 },
    'visa_us': { name: 'Visa Mỹ (51x51 mm)', aspectRatio: 1, widthMM: 51, heightMM: 51 },
    'visa_eu': { name: 'Visa Schengen (35x45 mm)', aspectRatio: 35 / 45, widthMM: 35, heightMM: 45 },
    'passport_vn': { name: 'Hộ chiếu VN (40x60 mm)', aspectRatio: 4 / 6, widthMM: 40, heightMM: 60 },
};
type CropKey = keyof typeof CROP_DEFINITIONS;


interface IDPhotoPageProps {
  initialImage: string | null;
  onNavigateBack: () => void;
  onOpenCustomerModal: (notes: string, restored: string, original: string) => void;
  onNavigateToPrintLayout: (image: LayoutImage) => void;
  // FIX: Add currentUser to props to access the userId
  currentUser: LocalUser;
}

const IDPhotoPage: React.FC<IDPhotoPageProps> = ({ initialImage, onNavigateBack, onOpenCustomerModal, onNavigateToPrintLayout, currentUser }) => {
  const [subjectImageFile, setSubjectImageFile] = useState<File | null>(null);
  const [subjectImageUrl, setSubjectImageUrl] = useState<string | null>(initialImage);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const [backgroundMode, setBackgroundMode] = useState<'color' | 'prompt' | 'upload'>('color');
  const [backgroundColor, setBackgroundColor] = useState('#007bff'); // Default blue
  const [backgroundPrompt, setBackgroundPrompt] = useState('');
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  
  const [clothingMode, setClothingMode] = useState<'predefined' | 'prompt' | 'upload'>('predefined');
  const [clothingDescription, setClothingDescription] = useState('');
  const [selectedPredefinedClothing, setSelectedPredefinedClothing] = useState('none');
  const [clothingFile, setClothingFile] = useState<File | null>(null);
  const [clothingFileUrl, setClothingFileUrl] = useState<string | null>(null);


  const [aiRetouch, setAiRetouch] = useState(true);
  const [lookStraight, setLookStraight] = useState(false);
  const [masterPrompt, setMasterPrompt] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropConfig, setCropConfig] = useState({ aspectRatio: 3 / 4, widthMM: 30, heightMM: 40 });
  const [isCropDropdownOpen, setIsCropDropdownOpen] = useState(false);

  const subjectImageInputRef = useRef<HTMLInputElement>(null);
  const cropDropdownRef = useRef<HTMLDivElement>(null);
  const clothingImageInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    // Convert initial data URL to file on load
    if (initialImage) {
        const file = dataURLtoFile(initialImage, `initial-id-photo.png`);
        setSubjectImageFile(file);
    }
  }, [initialImage]);

  const handleSubjectImageUpload = (file: File | null) => {
    if (file) {
      setSubjectImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSubjectImageUrl(reader.result as string);
        setGeneratedImageUrl(null); // Clear previous result
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClothingFileUpload = (file: File | null) => {
    if (file) {
        setClothingFile(file);
        // Create a URL for preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setClothingFileUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };


  const handleGenerate = async () => {
    if (!subjectImageFile || !subjectImageUrl) {
      setError('Vui lòng tải ảnh chân dung lên trước.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setGeneratedImageUrl(null);

    try {
      const base64SubjectData = subjectImageUrl.split(',')[1];
      const subjectMimeType = subjectImageFile.type;

      let backgroundFileData: { data: string, mimeType: string } | undefined;
      if (backgroundMode === 'upload' && backgroundFile) {
        const base64 = await fileToBase64(backgroundFile);
        backgroundFileData = { data: base64.split(',')[1], mimeType: backgroundFile.type };
      }

      let clothingFileData: { data: string, mimeType: string } | undefined;
      if (clothingMode === 'upload' && clothingFile && clothingFileUrl) {
          const base64 = clothingFileUrl.split(',')[1];
          clothingFileData = { data: base64, mimeType: clothingFile.type };
      }
      
      const currentClothingPrompt = clothingMode === 'predefined' 
        ? CLOTHING_OPTIONS.find(c => c.id === selectedPredefinedClothing)?.prompt ?? 'none'
        : clothingDescription;

      const result = await createIDPhoto(base64SubjectData, subjectMimeType, {
        backgroundMode,
        backgroundColor,
        backgroundPrompt,
        backgroundFile: backgroundFileData,
        clothingMode,
        clothingDescription: currentClothingPrompt,
        clothingFile: clothingFileData,
        aiRetouch,
        lookStraight,
        masterPrompt
      });

      if (result.image) {
        setGeneratedImageUrl(`data:image/png;base64,${result.image}`);
      } else {
        throw new Error(result.error || 'Tạo ảnh thẻ thất bại.');
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.';
      setError(`Lỗi: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOpenCropModal = (sizeKey: CropKey) => {
    const selectedSize = CROP_DEFINITIONS[sizeKey];
    setCropConfig({ 
        aspectRatio: selectedSize.aspectRatio,
        widthMM: selectedSize.widthMM,
        heightMM: selectedSize.heightMM,
    });
    setIsCropModalOpen(true);
    setIsCropDropdownOpen(false);
  };
  
  const handleSaveCroppedImage = (croppedDataUrl: string) => {
      setGeneratedImageUrl(croppedDataUrl);
      setIsCropModalOpen(false);
  };

  const handleDownload = () => {
    if (generatedImageUrl) {
      const link = document.createElement('a');
      link.href = generatedImageUrl;
      link.download = `id-photo.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleAssignToCustomer = () => {
    if (!generatedImageUrl || !subjectImageUrl) return;

    let notes = "Công việc: Làm ảnh thẻ AI\n";
    
    // Background info
    if (backgroundMode === 'color') {
        notes += `- Nền: Màu trơn (${backgroundColor})\n`;
    } else if (backgroundMode === 'prompt' && backgroundPrompt) {
        notes += `- Nền: Theo mô tả "${backgroundPrompt}"\n`;
    } else if (backgroundMode === 'upload') {
        notes += `- Nền: Theo ảnh tải lên\n`;
    }

    // Clothing info
    if (clothingMode === 'predefined' && selectedPredefinedClothing !== 'none') {
        const clothingName = CLOTHING_OPTIONS.find(c => c.id === selectedPredefinedClothing)?.name;
        notes += `- Trang phục: ${clothingName}\n`;
    } else if (clothingMode === 'prompt' && clothingDescription) {
        notes += `- Trang phục: Theo mô tả "${clothingDescription}"\n`;
    } else if (clothingMode === 'upload') {
        notes += `- Trang phục: Theo ảnh tải lên\n`;
    }

    if (aiRetouch) {
        notes += "- Có tự động làm đẹp.\n";
    }

    onOpenCustomerModal(notes, generatedImageUrl, subjectImageUrl);
  };
  
  const handleLayout = async () => {
    if (!generatedImageUrl || !subjectImageUrl || !currentUser.id) return;
    const thumbnailUrl = await createThumbnail(generatedImageUrl);
    // FIX: Add missing 'userId' property to satisfy the LayoutImage type.
    const imageToLayout: LayoutImage = {
        id: `new-${Date.now()}`,
        imageDataUrl: generatedImageUrl,
        thumbnailDataUrl: thumbnailUrl,
        originalImageUrl: subjectImageUrl,
        timestamp: Date.now(),
        userId: currentUser.id,
    };
    onNavigateToPrintLayout(imageToLayout);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (cropDropdownRef.current && !cropDropdownRef.current.contains(event.target as Node)) {
            setIsCropDropdownOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const renderImagePreview = (title: string, imageUrl: string | null, isGenerated: boolean = false) => (
    <div className="flex flex-col bg-slate-800 rounded-lg p-3 h-full">
      <h4 className="text-md font-semibold text-slate-300 mb-2 text-center">{title}</h4>
      <div className={`flex-grow flex items-center justify-center bg-black/20 rounded-md min-h-[200px] ${isGenerated && isLoading ? 'animate-pulse' : ''}`}>
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="max-w-full max-h-full object-contain rounded-md" loading="lazy" />
        ) : (
          <div className="text-center text-slate-500 p-4">
            <p>{title === 'Ảnh gốc' ? 'Tải ảnh lên để bắt đầu' : isLoading ? 'Đang tạo ảnh...' : 'Kết quả sẽ hiện ở đây'}</p>
          </div>
        )}
      </div>
    </div>
  );
  
  return (
    <div className="bg-[#10172A] w-full h-full flex flex-col page-enter-animation">
      {isCropModalOpen && generatedImageUrl && <ManualCropModal isOpen={isCropModalOpen} onClose={() => setIsCropModalOpen(false)} imageSrc={generatedImageUrl} aspectRatio={cropConfig.aspectRatio} outputWidthMM={cropConfig.widthMM} outputHeightMM={cropConfig.heightMM} onSave={handleSaveCroppedImage} />}
      
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 min-h-0">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-4 lg:h-full flex flex-col bg-[#1E293B] p-4 rounded-xl shadow-lg">
           <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex-shrink-0">Tùy chỉnh</h3>
           <div className="overflow-y-auto flex-grow pr-2 -mr-4 space-y-5">
              
              {/* Subject Image */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Ảnh chân dung</label>
                <div className="flex items-center gap-2">
                   <button onClick={() => subjectImageInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-md text-sm font-semibold transition-colors">
                       <UploadIcon className="w-4 h-4" /> Tải ảnh lên
                   </button>
                </div>
                <input ref={subjectImageInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleSubjectImageUpload(e.target.files ? e.target.files[0] : null)} />
              </div>

              {/* Background Options */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">Phông nền</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-700 rounded-md p-1">
                    <button onClick={() => setBackgroundMode('color')} className={`px-2 py-1 text-sm rounded ${backgroundMode === 'color' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-600'}`}>Màu trơn</button>
                    <button onClick={() => setBackgroundMode('prompt')} className={`px-2 py-1 text-sm rounded ${backgroundMode === 'prompt' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-600'}`}>Văn bản</button>
                    <button onClick={() => setBackgroundMode('upload')} className={`px-2 py-1 text-sm rounded ${backgroundMode === 'upload' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-600'}`}>Tải ảnh</button>
                </div>
                {backgroundMode === 'color' && (
                    <div className="flex items-center gap-3">
                      <input type="color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} className="w-10 h-10 p-1 bg-slate-700 border border-slate-600 rounded-md cursor-pointer" />
                      <div className="grid grid-cols-3 gap-2 flex-grow">
                          <button onClick={() => setBackgroundColor('#FFFFFF')} className="h-8 rounded border border-slate-500 bg-white" aria-label="Nền trắng"></button>
                          <button onClick={() => setBackgroundColor('#007bff')} className="h-8 rounded border border-slate-500 bg-[#007bff]" aria-label="Nền xanh"></button>
                          <button onClick={() => setBackgroundColor('#D1D5DB')} className="h-8 rounded border border-slate-500 bg-gray-300" aria-label="Nền xám"></button>
                      </div>
                    </div>
                )}
                 {backgroundMode === 'prompt' && <input type="text" value={backgroundPrompt} onChange={e => setBackgroundPrompt(e.target.value)} placeholder="VD: phông nền studio xám" className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm" />}
                 {backgroundMode === 'upload' && <input type="file" accept="image/*" onChange={e => setBackgroundFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-600 file:text-cyan-400 hover:file:bg-slate-500"/>}
              </div>

              {/* Clothing Options */}
              <div className="space-y-3">
                 <label className="block text-sm font-medium text-slate-300">Trang phục</label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-700 rounded-md p-1">
                      <button onClick={() => setClothingMode('predefined')} className={`px-2 py-1 text-sm rounded ${clothingMode === 'predefined' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-600'}`}>Mẫu có sẵn</button>
                      <button onClick={() => setClothingMode('prompt')} className={`px-2 py-1 text-sm rounded ${clothingMode === 'prompt' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-600'}`}>Văn bản</button>
                      <button onClick={() => setClothingMode('upload')} className={`px-2 py-1 text-sm rounded ${clothingMode === 'upload' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-600'}`}>Tải lên</button>
                  </div>
                 {clothingMode === 'predefined' && (
                    <div className="grid grid-cols-4 gap-2">
                        {CLOTHING_OPTIONS.map(opt => {
                            const Icon = opt.icon;
                            return (
                                <button key={opt.id} onClick={() => setSelectedPredefinedClothing(opt.id)} title={opt.name} className={`flex flex-col items-center justify-center gap-1 p-2 rounded-md aspect-square transition-colors ${selectedPredefinedClothing === opt.id ? 'bg-cyan-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                    <Icon className="w-6 h-6" />
                                    <span className="text-xs text-center leading-tight">{opt.name}</span>
                                </button>
                            )
                        })}
                    </div>
                 )}
                 {clothingMode === 'prompt' && <input type="text" value={clothingDescription} onChange={e => setClothingDescription(e.target.value)} placeholder="VD: áo dài màu xanh ngọc bích" className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm" />}
                 {clothingMode === 'upload' && (
                    <div>
                        <div
                            onClick={() => clothingImageInputRef.current?.click()}
                            className="relative group flex justify-center items-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer bg-slate-800 border-slate-600 hover:border-cyan-500"
                        >
                            {clothingFileUrl ? (
                                <img src={clothingFileUrl} alt="Xem trước trang phục" className="object-contain h-full w-full rounded-md p-1" loading="lazy" />
                            ) : (
                                <div className="text-center text-slate-400">
                                    <UploadIcon className="mx-auto h-8 w-8 mb-1" />
                                    <p className="text-xs font-semibold">Tải ảnh trang phục</p>
                                </div>
                            )}
                        </div>
                        <input
                            ref={clothingImageInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleClothingFileUpload(e.target.files ? e.target.files[0] : null)}
                        />
                    </div>
                 )}
              </div>

              {/* Other Options */}
              <div className="space-y-4">
                 <label htmlFor="aiRetouch" className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-slate-300">Tự động làm đẹp (Mặc định)</span>
                    <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${aiRetouch ? 'bg-cyan-500' : 'bg-slate-600'}`}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${aiRetouch ? 'translate-x-6' : 'translate-x-1'}`}/></div>
                    <input type="checkbox" id="aiRetouch" checked={aiRetouch} onChange={e => setAiRetouch(e.target.checked)} className="hidden" />
                </label>
                <label htmlFor="lookStraight" className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-slate-300">Nhìn thẳng</span>
                    <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${lookStraight ? 'bg-cyan-500' : 'bg-slate-600'}`}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${lookStraight ? 'translate-x-6' : 'translate-x-1'}`}/>
                    </div>
                    <input type="checkbox" id="lookStraight" checked={lookStraight} onChange={e => setLookStraight(e.target.checked)} className="hidden" />
                </label>
              </div>

              {/* Master Prompt */}
              <div className="space-y-2">
                <label htmlFor="masterPrompt" className="text-sm font-medium text-slate-300">Yêu cầu chung</label>
                <textarea id="masterPrompt" value={masterPrompt} onChange={e => setMasterPrompt(e.target.value)} rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm" placeholder="VD: làm cho ảnh trông chuyên nghiệp hơn, chỉnh lại tóc cho gọn gàng"></textarea>
              </div>
           </div>
           {error && <p className="text-red-400 text-sm mt-4 flex-shrink-0">{error}</p>}
           <button onClick={handleGenerate} disabled={!subjectImageUrl || isLoading} className="w-full mt-4 bg-cyan-500 text-white px-4 py-3 rounded-md text-base font-bold hover:bg-cyan-600 transition-colors disabled:bg-cyan-800 disabled:text-cyan-400 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0">
               {isLoading ? <><svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Đang xử lý...</> : 'Tạo ảnh thẻ'}
           </button>
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-8 lg:h-full flex flex-col gap-4">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow h-1/2 min-h-[250px]">
                {renderImagePreview('Ảnh gốc', subjectImageUrl)}
                {renderImagePreview('Ảnh thẻ đã tạo', generatedImageUrl, true)}
           </div>
           <div className="flex-shrink-0 bg-[#1E293B] p-4 rounded-xl shadow-lg">
             <h3 className="text-lg font-semibold text-cyan-400 mb-3">Công cụ hoàn thiện</h3>
             <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div ref={cropDropdownRef} className="relative">
                    <button onClick={() => setIsCropDropdownOpen(prev => !prev)} disabled={!generatedImageUrl || isLoading} className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <TuneIcon className="w-4 h-4" /> Cắt ảnh
                    </button>
                    {isCropDropdownOpen && (
                        <div className="absolute bottom-full left-0 mb-2 w-64 bg-slate-600 rounded-md shadow-lg z-20 overflow-hidden">
                            {CROP_PRESETS.map(preset => (
                                <div key={preset.name}>
                                    <h5 className="px-3 py-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">{preset.name}</h5>
                                    <ul>
                                        {preset.sizes.map(key => {
                                            const size = CROP_DEFINITIONS[key as CropKey];
                                            return <li key={key}><button onClick={() => handleOpenCropModal(key as CropKey)} className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-cyan-500 transition-colors">{size.name}</button></li>
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                 <button onClick={handleLayout} disabled={!generatedImageUrl || isLoading} className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                     <LayoutIcon className="w-4 h-4" /> Dàn trang
                 </button>
                 <button onClick={handleDownload} disabled={!generatedImageUrl || isLoading} className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <DownloadIcon className="w-4 h-4" /> Tải về
                </button>
                <button 
                    onClick={handleAssignToCustomer}
                    disabled={!generatedImageUrl || isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-md text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <UserPlusIcon className="w-4 h-4" /> Giao cho Khách
                </button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default IDPhotoPage;