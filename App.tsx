import React, { useState, useCallback } from 'react';
import type { RestorationOptions } from './types';
import Header from './components/Header';
import ResultViewer from './components/ResultViewer';
import { restoreImage, generate360Video, upscaleImage, recolorImage, applyArtisticStyle, animatePortrait, analyzeImageForRestoration, blurBackground, removeObjectFromImage, applyProColor } from './services/geminiService';
import UpscalerPage from './components/UpscalerPage';
import IDPhotoPage from './components/IDPhotoPage';
import CustomerHistoryPage from './components/CustomerHistoryPage';
import CustomerFormModal from './components/CustomerFormModal';
import { addCustomer, CustomerRecord, saveImage, LocalUser, findOrCreateGuestCustomer } from './services/dbService';
import PrintLayoutPage from './components/PrintLayoutPage';
import type { LayoutImage } from './components/PrintLayoutPage';
import Sidebar from './components/Sidebar';
import StudentCardPage from './components/StudentCardPage';
import HackConceptPage from './components/HackConceptPage';
import DocumentRestorerPage from './components/DocumentRestorerPage';
import StylePage from './components/StylePage';

export type Page = 'restorer' | 'upscaler' | 'idphoto' | 'customerhistory' | 'printlayout' | 'studentcard' | 'documentrestorer' | 'hackconcept' | 'style';


const dataURLtoFile = (dataurl: string, filename: string): File | null => {
    const arr = dataurl.split(',');
    if (arr.length < 2) return null;
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){ u8arr[n] = bstr.charCodeAt(n); }
    return new File([u8arr], filename, {type:mime});
}

const fileToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const App: React.FC = () => {
  const defaultUser: LocalUser = { id: 1, username: 'default', createdAt: 0, passwordHash: '' };

  const [currentPage, setCurrentPage] = useState<Page>('restorer');
  const [imageForUpscaler, setImageForUpscaler] = useState<string | null>(null);
  const [imageForIDPhoto, setImageForIDPhoto] = useState<string | null>(null);
  const [imageForPrintLayout, setImageForPrintLayout] = useState<LayoutImage | null>(null);

  const [options, setOptions] = useState<RestorationOptions>({
    model: 'Doubao Seedream4.0', colorize: true, highQuality: true, sharpenBackground: true,
    numPeople: '1', gender: 'auto', age: 'auto', smile: 'auto', isVietnamese: true, clothing: 'auto',
    hairStyle: 'auto', background: 'auto', transformationIntensity: 50, customRequest: '',
    numResults: '1', advancedRestore: false, redrawHands: false, redrawHair: false, mimicReference: false,
  });

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [initialRestoredImages, setInitialRestoredImages] = useState<string[] | null>(null);
  const [displayRestoredImages, setDisplayRestoredImages] = useState<string[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [clothingFile, setClothingFile] = useState<File | null>(null);
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [totalForProgress, setTotalForProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(false);
  const [isPortraitAnimating, setIsPortraitAnimating] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isUpscaling, setIsUpscaling] = useState<boolean>(false);
  const [upscalingState, setUpscalingState] = useState<{ index: number | null; factor: number | null }>({ index: null, factor: null });
  const [isRecoloring, setIsRecoloring] = useState<{ index: number | null; style: string | null }>({ index: null, style: null });
  const [isApplyingStyle, setIsApplyingStyle] = useState<{ index: number | null; style: string | null }>({ index: null, style: null });
  const [isBlurring, setIsBlurring] = useState<{ index: number | null; intensity: string | null }>({ index: null, intensity: null });
  const [isRemovingObject, setIsRemovingObject] = useState<{ [index: number]: boolean }>({});
  const [isApplyingProColor, setIsApplyingProColor] = useState<{ [index: number]: boolean }>({});
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [initialCustomerNotes, setInitialCustomerNotes] = useState('');
  const [imageToAssign, setImageToAssign] = useState<{ restored: string; original: string } | null>(null);

  const handleSendToUpscaler = useCallback((imageData: string) => { setImageForUpscaler(imageData); setCurrentPage('upscaler'); }, []);
  const handleReturnToRestorer = useCallback(() => { setCurrentPage('restorer'); setImageForIDPhoto(null); }, []);
  const handleNavigateToIDPhoto = useCallback((imageData: string | null = null) => { setImageForIDPhoto(imageData); setCurrentPage('idphoto'); }, []);
  const handleNavigateToCustomerHistory = useCallback(() => setCurrentPage('customerhistory'), []);
  const handleNavigateToPrintLayout = useCallback((image: LayoutImage | null = null) => { setImageForPrintLayout(image); setCurrentPage('printlayout'); }, []);
  
  const handleLoadFromArchive = useCallback((imageDataUrl: string) => {
    const file = dataURLtoFile(imageDataUrl, `archive-image-${Date.now()}.png`);
    if(file) { handleImageUpload(file); }
    setCurrentPage('restorer');
  }, []);

  const handleImageUpload = useCallback((file: File | null) => {
      if (file) {
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setOriginalImage(reader.result as string);
          setDisplayRestoredImages(null); setInitialRestoredImages(null); setGeneratedVideoUrl(null);
          setOptions(prev => ({...prev, customRequest: ''}));
          setAnalysisError(null); setClothingFile(null); setReferenceImageFile(null);
        };
        reader.readAsDataURL(file);
      } else { setImageFile(null); setOriginalImage(null); }
  }, []);
  
  const handleClothingUpload = useCallback((file: File | null) => setClothingFile(file), []);
  const handleReferenceImageUpload = useCallback((file: File | null) => {
    setReferenceImageFile(file);
    setOptions(prev => ({ ...prev, mimicReference: !!file }));
  }, []);

  const handleAnalyzeImage = useCallback(async () => {
    if (!originalImage || !imageFile) { setAnalysisError("Vui lòng tải ảnh lên trước khi phân tích."); return; }
    setIsAnalyzing(true); setAnalysisError(null);
    try {
      const base64Image = originalImage.split(',')[1];
      const result = await analyzeImageForRestoration(base64Image, imageFile.type);
      if (result.prompt) setOptions(prev => ({...prev, customRequest: result.prompt}));
      if (result.error) setAnalysisError(result.error);
    } catch (err) { console.error("Analysis failed:", err); setAnalysisError("Không thể phân tích ảnh."); } 
    finally { setIsAnalyzing(false); }
  }, [originalImage, imageFile]);

  const handleRestore = useCallback(async () => {
    if (!imageFile) { setError('Vui lòng tải ảnh lên trước.'); return; }
    setLoading(true); setError(null); setDisplayRestoredImages([]); setInitialRestoredImages([]); setGeneratedVideoUrl(null);
    try {
      const base64Image = originalImage?.split(',')[1];
      if (!base64Image) throw new Error('Không thể xử lý ảnh.');
      
      let clothingFileData;
      if (clothingFile) {
          const base64Clothing = await fileToBase64(clothingFile);
          clothingFileData = { data: base64Clothing.split(',')[1], mimeType: clothingFile.type };
      }
      let referenceImageData;
      if (referenceImageFile && options.mimicReference) {
          const base64Reference = await fileToBase64(referenceImageFile);
          referenceImageData = { data: base64Reference.split(',')[1], mimeType: referenceImageFile.type };
      }
      let numToGenerate = parseInt(options.numResults, 10) || 1;
      numToGenerate = Math.max(1, Math.min(numToGenerate, 5));
      setProgress(0); setTotalForProgress(numToGenerate);
      let successfulCount = 0; let firstError: string | null = null; const allRestoredImages: string[] = [];
      for (let i = 0; i < numToGenerate; i++) {
        try {
          if (i > 0) await new Promise(resolve => setTimeout(resolve, 500));
          const result = await restoreImage(base64Image, imageFile.type, options, clothingFileData, referenceImageData);
          if (result.image) {
            successfulCount++;
            const fullImage = `data:image/png;base64,${result.image}`;
            allRestoredImages.push(fullImage);
            setDisplayRestoredImages([...allRestoredImages]); setInitialRestoredImages([...allRestoredImages]);
          } else { console.error(`Failed to restore image ${i + 1}:`, result.error); if (!firstError) firstError = result.error; }
        } catch (err) {
            console.error(`Error during restoration of image ${i + 1}:`, err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.'; if (!firstError) firstError = errorMessage;
        } finally { setProgress(p => p + 1); }
      }
      if (successfulCount === 0 && numToGenerate > 0) throw new Error(firstError || 'Tất cả các lần phục hồi ảnh đều thất bại. Vui lòng thử lại.');
      if (successfulCount < numToGenerate) setError(`Hoàn thành với cảnh báo: Chỉ phục hồi thành công ${successfulCount}/${numToGenerate} ảnh.`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.'; setError(`Lỗi: ${errorMessage}`); console.error(err);
    } finally { setLoading(false); }
  }, [imageFile, options, originalImage, clothingFile, referenceImageFile]);

  const handleGenerateVideo = useCallback(async (imageToAnimate: string | null) => { if (!imageToAnimate) { setVideoError('Cần có ảnh đã phục hồi để tạo video.'); return; } setIsVideoLoading(true); setVideoError(null); setGeneratedVideoUrl(null); try { const base64Image = imageToAnimate.split(',')[1]; const videoUrl = await generate360Video(base64Image, 'image/png'); setGeneratedVideoUrl(videoUrl); } catch (err: unknown) { const errorMessage = err instanceof Error ? String(err.message) : String(err); if (errorMessage.includes('Requested entity was not found.')) { setVideoError('API Key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại.'); } else { setVideoError(errorMessage); } console.error(err); } finally { setIsVideoLoading(false); } }, []);
  const handleAnimatePortrait = useCallback(async (imageToAnimate: string | null) => { if (!imageToAnimate) { setVideoError('Cần có ảnh đã phục hồi để tạo video.'); return; } setIsPortraitAnimating(true); setVideoError(null); setGeneratedVideoUrl(null); try { const base64Image = imageToAnimate.split(',')[1]; const videoUrl = await animatePortrait(base64Image, 'image/png'); setGeneratedVideoUrl(videoUrl); } catch (err: unknown) { const errorMessage = err instanceof Error ? String(err.message) : String(err); if (errorMessage.includes('Requested entity was not found.')) { setVideoError('API Key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại.'); } else { setVideoError(errorMessage); } console.error(err); } finally { setIsPortraitAnimating(false); } }, []);
  const handleUpscale = useCallback(async (imageIndex: number, scaleFactor: number) => { const imageToUpscale = displayRestoredImages?.[imageIndex]; if (!imageToUpscale) { setError('Không tìm thấy ảnh để nâng cấp.'); return; } setIsUpscaling(true); setUpscalingState({ index: imageIndex, factor: scaleFactor }); setError(null); setVideoError(null); try { const base64Image = imageToUpscale.split(',')[1]; const result = await upscaleImage(base64Image, 'image/png', scaleFactor); if (result.image) { const upscaledImage = `data:image/png;base64,${result.image}`; const update = (prev: string[] | null) => { const n = [...(prev || [])]; if (n[imageIndex]) n[imageIndex] = upscaledImage; return n; }; setDisplayRestoredImages(update); setInitialRestoredImages(update); } else { throw new Error(result.error || `Nâng cấp ảnh ${scaleFactor}x thất bại.`); } } catch (err: unknown) { const errorMessage = err instanceof Error ? err.message : `Đã xảy ra lỗi không xác định khi nâng cấp ảnh ${scaleFactor}x.`; setError(`Lỗi nâng cấp ${scaleFactor}x: ${errorMessage}`); console.error(err); } finally { setIsUpscaling(false); setUpscalingState({ index: null, factor: null }); } }, [displayRestoredImages]);
  const handleRecolor = useCallback(async (imageIndex: number, colorStyle: string) => { const imageToRecolor = displayRestoredImages?.[imageIndex]; if (!imageToRecolor) { setError('Không tìm thấy ảnh để chỉnh màu.'); return; } setIsRecoloring({ index: imageIndex, style: colorStyle }); setError(null); setVideoError(null); try { const base64Image = imageToRecolor.split(',')[1]; const result = await recolorImage(base64Image, 'image/png', colorStyle); if (result.image) { const recoloredImage = `data:image/png;base64,${result.image}`; setDisplayRestoredImages(prev => { const n = [...(prev || [])]; if (n[imageIndex]) n[imageIndex] = recoloredImage; return n; }); } else { throw new Error(result.error || `Chỉnh màu ảnh thất bại.`); } } catch (err: unknown) { const errorMessage = err instanceof Error ? err.message : `Đã xảy ra lỗi không xác định khi chỉnh màu.`; setError(`Lỗi chỉnh màu: ${errorMessage}`); console.error(err); } finally { setIsRecoloring({ index: null, style: null }); } }, [displayRestoredImages]);
  const handleApplyStyle = useCallback(async (imageIndex: number, artisticStyle: string) => { const imageToStyle = displayRestoredImages?.[imageIndex]; if (!imageToStyle) { setError('Không tìm thấy ảnh để áp dụng phong cách.'); return; } setIsApplyingStyle({ index: imageIndex, style: artisticStyle }); setError(null); setVideoError(null); try { const base64Image = imageToStyle.split(',')[1]; const result = await applyArtisticStyle(base64Image, 'image/png', artisticStyle); if (result.image) { const styledImage = `data:image/png;base64,${result.image}`; setDisplayRestoredImages(prev => { const n = [...(prev || [])]; if (n[imageIndex]) n[imageIndex] = styledImage; return n; }); } else { throw new Error(result.error || `Áp dụng phong cách thất bại.`); } } catch (err: unknown) { const errorMessage = err instanceof Error ? err.message : `Đã xảy ra lỗi không xác định khi áp dụng phong cách.`; setError(`Lỗi áp dụng phong cách: ${errorMessage}`); console.error(err); } finally { setIsApplyingStyle({ index: null, style: null }); } }, [displayRestoredImages]);
  const handleBlurBackground = useCallback(async (imageIndex: number, intensity: 'subtle' | 'medium' | 'strong') => { const imageToBlur = displayRestoredImages?.[imageIndex]; if (!imageToBlur) { setError('Không tìm thấy ảnh để làm mờ nền.'); return; } setIsBlurring({ index: imageIndex, intensity }); setError(null); setVideoError(null); try { const base64Image = imageToBlur.split(',')[1]; const result = await blurBackground(base64Image, 'image/png', intensity); if (result.image) { const blurredImage = `data:image/png;base64,${result.image}`; setDisplayRestoredImages(prev => { const n = [...(prev || [])]; if (n[imageIndex]) n[imageIndex] = blurredImage; return n; }); } else { throw new Error(result.error || `Làm mờ nền thất bại.`); } } catch (err: unknown) { const errorMessage = err instanceof Error ? err.message : `Đã xảy ra lỗi không xác định khi làm mờ nền.`; setError(`Lỗi làm mờ nền: ${errorMessage}`); console.error(err); } finally { setIsBlurring({ index: null, intensity: null }); } }, [displayRestoredImages]);
  const handleRemoveObject = useCallback(async (imageIndex: number, maskDataUrl: string) => { const imageToRemoveObject = displayRestoredImages?.[imageIndex]; if (!imageToRemoveObject) { setError('Không tìm thấy ảnh để xóa đối tượng.'); return; } setIsRemovingObject(prev => ({ ...prev, [imageIndex]: true })); setError(null); setVideoError(null); try { const base64Image = imageToRemoveObject.split(',')[1]; const base64Mask = maskDataUrl.split(',')[1]; const result = await removeObjectFromImage(base64Image, base64Mask, 'image/png'); if (result.image) { const newImage = `data:image/png;base64,${result.image}`; const update = (prev: string[] | null) => { const n = [...(prev || [])]; if (n[imageIndex]) n[imageIndex] = newImage; return n; }; setDisplayRestoredImages(update); setInitialRestoredImages(update); } else { throw new Error(result.error || `Xóa đối tượng thất bại.`); } } catch (err: unknown) { const errorMessage = err instanceof Error ? err.message : `Đã xảy ra lỗi không xác định khi xóa đối tượng.`; setError(`Lỗi xóa đối tượng: ${errorMessage}`); console.error(err); } finally { setIsRemovingObject(prev => ({ ...prev, [imageIndex]: false })); } }, [displayRestoredImages]);
  const handleApplyProColor = useCallback(async (imageIndex: number) => { const imageToColor = displayRestoredImages?.[imageIndex]; if (!imageToColor) { setError('Không tìm thấy ảnh để lên màu.'); return; } setIsApplyingProColor(prev => ({ ...prev, [imageIndex]: true })); setError(null); setVideoError(null); try { const base64Image = imageToColor.split(',')[1]; const result = await applyProColor(base64Image, 'image/png'); if (result.image) { const newImage = `data:image/png;base64,${result.image}`; setDisplayRestoredImages(prev => { const n = [...(prev || [])]; if (n[imageIndex]) n[imageIndex] = newImage; return n; }); } else { throw new Error(result.error || `Lên màu chuyên nghiệp thất bại.`); } } catch (err: unknown) { const errorMessage = err instanceof Error ? err.message : `Đã xảy ra lỗi không xác định khi lên màu.`; setError(`Lỗi lên màu: ${errorMessage}`); console.error(err); } finally { setIsApplyingProColor(prev => ({ ...prev, [imageIndex]: false })); } }, [displayRestoredImages]);
  const handleRevertToOriginalColor = useCallback((imageIndex: number) => { if (initialRestoredImages && initialRestoredImages[imageIndex]) { setDisplayRestoredImages(prev => { const n = [...(prev || [])]; n[imageIndex] = initialRestoredImages[imageIndex]; return n; }); } }, [initialRestoredImages]);
  const handleCloseVideo = useCallback(() => { if (generatedVideoUrl) URL.revokeObjectURL(generatedVideoUrl); setGeneratedVideoUrl(null); }, [generatedVideoUrl]);
  const handleUpdateImage = useCallback((imageIndex: number, newImageDataUrl: string) => { const update = (prev: string[] | null) => { if (!prev) return null; const n = [...prev]; if (n[imageIndex]) n[imageIndex] = newImageDataUrl; return n; }; setDisplayRestoredImages(update); setInitialRestoredImages(update); }, []);
  const handleOpenCustomerModal = useCallback((notes: string, restored: string, original: string) => { setInitialCustomerNotes(notes); setImageToAssign({ restored, original }); setIsCustomerModalOpen(true); }, []);
  const handleCloseCustomerModal = () => { setIsCustomerModalOpen(false); setInitialCustomerNotes(''); setImageToAssign(null); };
  
  const handleSaveNewCustomer = async (customerData: Omit<CustomerRecord, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    try {
      const newId = await addCustomer({ ...customerData, userId: defaultUser.id });
      if (imageToAssign) await saveImage(imageToAssign.restored, imageToAssign.original, defaultUser.id, newId);
      alert('Đã lưu thông tin khách hàng thành công!'); handleCloseCustomerModal();
    } catch (err) { console.error("Failed to save customer:", err); alert('Lưu thông tin khách hàng thất bại.'); }
  };

  const handleQuickSave = async (restored: string, original: string) => {
    try {
        const guestCustomer = await findOrCreateGuestCustomer(defaultUser.id);
        if (guestCustomer && guestCustomer.id) {
            await saveImage(restored, original, defaultUser.id, guestCustomer.id);
            alert('Đã lưu nhanh vào mục "Khách lẻ" trong Lịch sử khách hàng.');
        } else {
            throw new Error("Không thể tạo hoặc tìm khách hàng mặc định.");
        }
    } catch(err) {
        console.error("Quick save failed:", err);
        alert('Lưu nhanh thất bại.');
    }
  };

  const renderCurrentPage = () => {
    switch(currentPage) {
        case 'restorer':
            return <ResultViewer 
                options={options}
                setOptions={setOptions}
                onImageUpload={handleImageUpload}
                isImageUploaded={!!originalImage}
                onRestore={handleRestore}
                previewUrl={originalImage}
                onAnalyzeImage={handleAnalyzeImage}
                isAnalyzing={isAnalyzing}
                analysisError={analysisError}
                onClothingUpload={handleClothingUpload}
                clothingFile={clothingFile}
                onReferenceImageUpload={handleReferenceImageUpload}
                referenceImageFile={referenceImageFile}
                originalImage={originalImage} 
                restoredImages={displayRestoredImages} 
                isLoading={loading} 
                error={error} 
                progress={progress} 
                totalForProgress={totalForProgress} 
                onGenerateVideo={handleGenerateVideo} 
                isVideoLoading={isVideoLoading} 
                videoError={videoError} 
                generatedVideoUrl={generatedVideoUrl} 
                onCloseVideo={handleCloseVideo} 
                onUpscaleImage={handleUpscale} 
                isUpscaling={isUpscaling} 
                upscalingState={upscalingState} 
                onRecolorImage={handleRecolor} 
                isRecoloring={isRecoloring} 
                onRevertToOriginalColor={handleRevertToOriginalColor} 
                onApplyStyle={handleApplyStyle} 
                isApplyingStyle={isApplyingStyle} 
                onAnimatePortrait={handleAnimatePortrait} 
                isPortraitAnimating={isPortraitAnimating} 
                onBlurBackground={handleBlurBackground} 
                isBlurring={isBlurring} 
                onRemoveObject={handleRemoveObject} 
                isRemovingObject={isRemovingObject} 
                onSendToUpscaler={handleSendToUpscaler} 
                onApplyProColor={handleApplyProColor} 
                isApplyingProColor={isApplyingProColor} 
                onNavigateToIDPhoto={handleNavigateToIDPhoto} 
                onUpdateImage={handleUpdateImage} 
                onOpenCustomerModal={handleOpenCustomerModal} 
                onQuickSave={handleQuickSave} 
                onNavigateToPrintLayout={handleNavigateToPrintLayout}
                currentUser={defaultUser}
            />;
        case 'upscaler':
            return <UpscalerPage imageToUpscale={imageForUpscaler} onNavigateBack={handleReturnToRestorer} />;
        case 'idphoto':
            return <IDPhotoPage initialImage={imageForIDPhoto} onNavigateBack={handleReturnToRestorer} onOpenCustomerModal={handleOpenCustomerModal} onNavigateToPrintLayout={handleNavigateToPrintLayout} currentUser={defaultUser} />;
        case 'customerhistory':
            return <CustomerHistoryPage onNavigateBack={handleReturnToRestorer} onLoadImage={handleLoadFromArchive} currentUser={defaultUser} />;
        case 'printlayout':
            return <PrintLayoutPage initialImage={imageForPrintLayout} onNavigateBack={handleReturnToRestorer} currentUser={defaultUser} />;
        case 'studentcard':
             return <StudentCardPage onNavigateBack={handleReturnToRestorer} />;
        case 'documentrestorer':
            return <DocumentRestorerPage onNavigateBack={handleReturnToRestorer} />;
        case 'hackconcept':
            return <HackConceptPage onNavigateBack={handleReturnToRestorer} currentUser={defaultUser} />;
        case 'style':
            return <StylePage onNavigateBack={handleReturnToRestorer} />;
        default:
            return null;
    }
  }


  return (
    <div className="min-h-screen text-slate-200 font-sans flex flex-col">
      <CustomerFormModal isOpen={isCustomerModalOpen} onClose={handleCloseCustomerModal} onSave={(customerData) => handleSaveNewCustomer(customerData as any)} initialNotes={initialCustomerNotes} />
      <Header />
      <div className="flex flex-grow min-h-0">
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <main className="flex-grow bg-gradient-to-b from-[#10172A] to-[#075985] p-4">
            {renderCurrentPage()}
        </main>
      </div>
      <footer className="bg-slate-900 border-t border-slate-800 py-2 overflow-hidden flex-shrink-0">
        <div className="scrolling-lyrics-container">
            <div className="scrolling-lyrics-text text-yellow-400 font-bold text-sm">
                Liên hệ Đinh Thành Zalo 0915.213.717 &nbsp;&nbsp;&nbsp;&nbsp; Liên hệ Đinh Thành Zalo 0915.213.717 &nbsp;&nbsp;&nbsp;&nbsp; Liên hệ Đinh Thành Zalo 0915.213.717 &nbsp;&nbsp;&nbsp;&nbsp; Liên hệ Đinh Thành Zalo 0915.213.717
            </div>
        </div>
      </footer>
    </div>
  );
};
export default App;