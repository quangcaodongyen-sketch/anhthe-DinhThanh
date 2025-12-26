import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { Trash2Icon } from './icons/Trash2Icon';
import { RotateCwIcon } from './icons/RotateCwIcon';
import { ArchivedImage, CustomerRecord, getAllCustomers, LocalUser } from '../services/dbService';
import CustomerImagePicker from './CustomerImagePicker';
import { changeImageBackground } from '../services/geminiService';
import { UsersIcon } from './icons/UsersIcon';
import { UploadIcon } from './icons/UploadIcon';
import PrintPreviewModal from './PrintPreviewModal';

export type LayoutImage = Omit<ArchivedImage, 'id' | 'customerId'> & {
    id: number | string;
    customerId?: number;
    customerName?: string;
};

interface PlacedPhoto {
    instanceId: number;
    sourceId: number | string;
    sizeKey: PhotoSizeKey;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: 0 | 90 | 180 | 270;
}

const PAPER_SIZES = {
  a4: { name: 'A4 (210 x 297 mm)', widthMM: 210, heightMM: 297 },
  '10x15': { name: '10x15 cm (4R)', widthMM: 102, heightMM: 152 },
  '13x18': { name: '13x18 cm (5R)', widthMM: 127, heightMM: 178 },
};

const PHOTO_SIZES = {
  '2x3': { name: '2x3 cm', widthMM: 20, heightMM: 30 },
  '3x4': { name: '3x4 cm', widthMM: 30, heightMM: 40 },
  '4x6': { name: '4x6 cm', widthMM: 40, heightMM: 60 },
  'visa_eu': { name: 'Visa EU 3.5x4.5 cm', widthMM: 35, heightMM: 45 },
  'visa_us': { name: 'Visa US 5.1x5.1 cm', widthMM: 51, heightMM: 51 },
};
type PhotoSizeKey = keyof typeof PHOTO_SIZES;
type PaperSizeKey = keyof typeof PAPER_SIZES;

const getEffectiveDimensions = (photo: { width: number, height: number, rotation: number }) => {
    const isSideways = photo.rotation === 90 || photo.rotation === 270;
    return {
        width: isSideways ? photo.height : photo.width,
        height: isSideways ? photo.width : photo.height
    };
};

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

interface PrintLayoutPageProps {
  initialImage: LayoutImage | null;
  onNavigateBack: () => void;
  currentUser: LocalUser;
}

const PrintLayoutPage: React.FC<PrintLayoutPageProps> = ({ initialImage, onNavigateBack, currentUser }) => {
    const [mode, setMode] = useState<'auto' | 'manual'>('manual');
    const [paperSizeKey, setPaperSizeKey] = useState<PaperSizeKey>('10x15');
    const [linkedMargins, setLinkedMargins] = useState(true);
    const [margins, setMargins] = useState({ top: 5, bottom: 5, left: 5, right: 5 });
    const [spacing, setSpacing] = useState(0.5);
    const [addBorder, setAddBorder] = useState(true);
    const [borderWidth, setBorderWidth] = useState(0.3);
    const [borderColor, setBorderColor] = useState('#000000');

    const [sourceImages, setSourceImages] = useState<LayoutImage[]>([]);
    const [placedPhotos, setPlacedPhotos] = useState<PlacedPhoto[]>([]);
    const [nextInstanceId, setNextInstanceId] = useState(0);
    const [isLoadingVariant, setIsLoadingVariant] = useState<Record<string, 'white' | 'blue' | false>>({});

    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const [previewScale, setPreviewScale] = useState(1);
    const [customers, setCustomers] = useState<CustomerRecord[]>([]);

    // State for print modal
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [printPreviewUrl, setPrintPreviewUrl] = useState<string | null>(null);
    const [isPreparingPrint, setIsPreparingPrint] = useState(false);


    useEffect(() => {
        if (initialImage) {
            setMode('auto');
            if (!sourceImages.some(img => img.id === initialImage.id)) {
                setSourceImages([initialImage]);
            }
        } else {
             setMode('manual');
        }
    }, [initialImage]);

    useEffect(() => {
        const fetchCusts = async () => {
            if (!currentUser.id) return;
            const custData = await getAllCustomers(currentUser.id);
            setCustomers(custData);
        };
        fetchCusts();
    }, [currentUser.id]);

    const paper = useMemo(() => PAPER_SIZES[paperSizeKey], [paperSizeKey]);

    const handleMarginChange = (side: 'top' | 'bottom' | 'left' | 'right', value: number) => {
        if (linkedMargins) {
            setMargins({ top: value, bottom: value, left: value, right: value });
        } else {
            setMargins(prev => ({ ...prev, [side]: value }));
        }
    };
    
   const packPhotos = useCallback((photosToPlace: PlacedPhoto[]): PlacedPhoto[] => {
        if (photosToPlace.length === 0) return [];

        const sortedPhotos = [...photosToPlace].sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
        
        const packedLayout: PlacedPhoto[] = [];
        const availableWidth = paper.widthMM - margins.left - margins.right;
        const availableHeight = paper.heightMM - margins.top - margins.bottom;
        
        let cursorX = 0;
        let cursorY = 0;
        let rowHeight = 0;

        // 1. Pack photos to top-left first
        for (const photo of sortedPhotos) {
            const { width: effectiveWidth, height: effectiveHeight } = getEffectiveDimensions(photo);

            if (cursorX > 0 && cursorX + spacing + effectiveWidth > availableWidth) {
                cursorX = 0;
                cursorY += rowHeight + spacing;
                rowHeight = 0;
            }

            if (cursorY + effectiveHeight > availableHeight) {
                continue; // Cannot fit anymore vertically
            }
            
            if (cursorX === 0 && effectiveWidth > availableWidth) {
                continue; // Photo wider than available space
            }

            const finalX = (cursorX === 0) ? 0 : cursorX + spacing;
            
            packedLayout.push({ ...photo, x: finalX, y: cursorY });

            cursorX = finalX + effectiveWidth;
            rowHeight = Math.max(rowHeight, effectiveHeight);
        }

        // 2. Calculate the bounding box of the packed photos
        let maxX = 0;
        let maxY = 0;
        
        packedLayout.forEach(p => {
            const { width, height } = getEffectiveDimensions(p);
            maxX = Math.max(maxX, p.x + width);
            maxY = Math.max(maxY, p.y + height);
        });

        // 3. Calculate offsets to center the group on the paper
        const offsetX = Math.max(0, (availableWidth - maxX) / 2);
        const offsetY = Math.max(0, (availableHeight - maxY) / 2);

        // 4. Apply offsets to center
        return packedLayout.map(p => ({
            ...p,
            x: p.x + offsetX,
            y: p.y + offsetY
        }));

    }, [paper, margins, spacing]);
    
    useEffect(() => {
        setPlacedPhotos(currentPhotos => packPhotos(currentPhotos));
    }, [packPhotos]); 

    const handleAutoLayout = (sizes: PhotoSizeKey[]) => {
        if (sourceImages.length === 0) return;
        const sourceImage = sourceImages[0];

        let photosToPlace: Omit<PlacedPhoto, 'x'|'y'>[] = [];
        let canContinuePacking = true;
        let currentInstanceId = 0;

        const allPossibleSizes = (sizes.length > 1) 
            ? [...sizes].sort((a, b) => {
                const sizeA = PHOTO_SIZES[a]; const sizeB = PHOTO_SIZES[b];
                return (sizeB.widthMM * sizeB.heightMM) - (sizeA.widthMM * sizeA.heightMM);
            })
            : sizes;

        while(canContinuePacking) {
            let photoAddedInThisCycle = false;
            for (const sizeKey of allPossibleSizes) {
                const photoSize = PHOTO_SIZES[sizeKey];
                 const newPhoto: Omit<PlacedPhoto, 'x'|'y'> = {
                    instanceId: currentInstanceId,
                    sourceId: sourceImage.id, sizeKey,
                    width: photoSize.widthMM, height: photoSize.heightMM, rotation: 0
                };

                const attemptLayout = [...photosToPlace, newPhoto].map(p => ({ ...p, x: 0, y: 0 }));
                const packedResult = packPhotos(attemptLayout);

                if (packedResult.length === attemptLayout.length) {
                    photosToPlace.push(newPhoto);
                    currentInstanceId++;
                    photoAddedInThisCycle = true;
                    if (sizes.length === 1) continue; 
                }
            }
            if (!photoAddedInThisCycle || (sizes.length > 1 && photosToPlace.length > 50)) { 
                canContinuePacking = false;
            }
        }
        
        const finalPackedLayout = packPhotos(photosToPlace.map(p => ({...p, x:0, y:0})));
        setPlacedPhotos(finalPackedLayout);
        setNextInstanceId(currentInstanceId);
    };
    
    const addPhotoToLayout = (sourceImageId: string | number, sizeKey: PhotoSizeKey) => {
        const photoSize = PHOTO_SIZES[sizeKey];
        const newPhoto: PlacedPhoto = {
            instanceId: nextInstanceId, sourceId: sourceImageId, sizeKey,
            x: 0, y: 0, width: photoSize.widthMM, height: photoSize.heightMM, rotation: 0,
        };
        setNextInstanceId(p => p + 1);
        setPlacedPhotos(prev => packPhotos([...prev, newPhoto]));
    };

    const removeOnePhotoFromLayout = (sourceImageId: string | number, sizeKey: PhotoSizeKey) => {
        setPlacedPhotos(prev => {
            let indexToRemove = -1;
            for (let i = prev.length - 1; i >= 0; i--) {
                if (prev[i].sourceId === sourceImageId && prev[i].sizeKey === sizeKey) {
                    indexToRemove = i;
                    break;
                }
            }

            if (indexToRemove !== -1) {
                const newPhotos = [...prev.slice(0, indexToRemove), ...prev.slice(indexToRemove + 1)];
                return packPhotos(newPhotos);
            }
            
            return prev;
        });
    };
    
    const removeImageFromStaging = (id: string | number) => {
        setSourceImages(prev => prev.filter(img => img.id !== id));
        setPlacedPhotos(prev => packPhotos(prev.filter(p => p.sourceId !== id)));
    };

    const handleChangeBackground = async (sourceId: string | number, color: 'white' | 'blue') => {
        const sourceImage = sourceImages.find(img => img.id === sourceId);
        if (!sourceImage) return;

        setIsLoadingVariant(prev => ({...prev, [String(sourceId)]: color }));
        try {
            const base64Data = sourceImage.imageDataUrl.split(',')[1];
            const mimeType = sourceImage.imageDataUrl.match(/:(.*?);/)?.[1] || 'image/png';
            const result = await changeImageBackground(base64Data, mimeType, color);
            if (result.image) {
                const fullResUrl = `data:image/png;base64,${result.image}`;
                const thumbnailUrl = await createThumbnail(fullResUrl);
                const newId = `${sourceId}-${color}-${Date.now()}`;
                const newVariant: LayoutImage = {
                    ...sourceImage,
                    id: newId,
                    imageDataUrl: fullResUrl,
                    thumbnailDataUrl: thumbnailUrl,
                };
                setSourceImages(prev => [...prev, newVariant]);
            } else {
                throw new Error(result.error || 'Failed to change background');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingVariant(prev => ({...prev, [String(sourceId)]: false }));
        }
    };


    const removePhotoFromLayout = (instanceId: number) => setPlacedPhotos(prev => packPhotos(prev.filter(p => p.instanceId !== instanceId)));
    const rotatePhotoInLayout = (instanceId: number) => setPlacedPhotos(prev => packPhotos(prev.map(p => p.instanceId === instanceId ? { ...p, rotation: ((p.rotation + 90) % 360) as PlacedPhoto['rotation'] } : p)));
    const handleImageSelectFromPicker = (image: ArchivedImage) => {
        const customerName = customers.find(c => c.id === image.customerId)?.name;
        const layoutImage: LayoutImage = { ...image, customerName };
        if (!sourceImages.some(img => img.id === layoutImage.id)) {
            setSourceImages(prev => [layoutImage, ...prev]);
        }
        setIsPickerOpen(false);
    };

    const handleLocalImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0 || !currentUser.id) return;
    
        const newImagesPromises = Array.from(files).map(async (file: File, index) => {
            const imageDataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target?.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
    
            const thumbnailUrl = await createThumbnail(imageDataUrl);
    
            const newImage: LayoutImage = {
                id: `local-${Date.now()}-${index}`,
                imageDataUrl: imageDataUrl,
                thumbnailDataUrl: thumbnailUrl,
                originalImageUrl: imageDataUrl,
                timestamp: Date.now(),
                customerName: `Tải lên: ${file.name.substring(0, 20)}...`,
                userId: currentUser.id!,
            };
            return newImage;
        });
    
        try {
            const newImages = await Promise.all(newImagesPromises);
            setSourceImages(prev => [...newImages, ...prev]);
        } catch (err) {
            console.error("Error processing uploaded files:", err);
            alert('Đã xảy ra lỗi khi xử lý tệp tải lên.');
        }
    
        if (event.target) {
            event.target.value = '';
        }
    };

    const generateLayoutCanvas = useCallback(async (): Promise<HTMLCanvasElement | null> => {
        const DPI = 300;
        const MM_PER_INCH = 25.4;
        const mmToPx = (mm: number) => (mm * DPI) / MM_PER_INCH;
    
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(mmToPx(paper.widthMM));
        canvas.height = Math.round(mmToPx(paper.heightMM));
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
    
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    
        const loadedImages: { [key: string]: HTMLImageElement } = {};
        const imageLoadPromises = Array.from(new Set(placedPhotos.map(p => p.sourceId)))
            .map(sourceId => {
                const sourceImage = sourceImages.find(s => s.id === sourceId);
                if (sourceImage) {
                    return new Promise<void>((resolve, reject) => {
                        const domImg = new Image();
                        domImg.crossOrigin = 'anonymous';
                        domImg.onload = () => {
                            loadedImages[String(sourceId)] = domImg;
                            resolve();
                        };
                        domImg.onerror = () => reject(new Error(`Failed to load image ${sourceId}`));
                        domImg.src = sourceImage.imageDataUrl;
                    });
                }
                return Promise.resolve();
            });
    
        try {
            await Promise.all(imageLoadPromises);
        } catch (error) {
            alert(`Lỗi tải ảnh để xử lý: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
            return null;
        }
    
        for (const photo of placedPhotos) {
            const imageToDraw = loadedImages[String(photo.sourceId)];
            if (!imageToDraw) continue;
    
            ctx.save();
            const { width: effectiveWidthMM, height: effectiveHeightMM } = getEffectiveDimensions(photo);
            
            const x_px = mmToPx(margins.left + photo.x);
            const y_px = mmToPx(margins.top + photo.y);
            const width_px = mmToPx(effectiveWidthMM);
            const height_px = mmToPx(effectiveHeightMM);
            
            ctx.translate(x_px + width_px / 2, y_px + height_px / 2);
            ctx.rotate(photo.rotation * Math.PI / 180);
            
            const destWidthPx = mmToPx(photo.width);
            const destHeightPx = mmToPx(photo.height);
    
            const sourceAspectRatio = imageToDraw.naturalWidth / imageToDraw.naturalHeight;
            const destAspectRatio = photo.width / photo.height;
    
            let sx = 0, sy = 0, sWidth = imageToDraw.naturalWidth, sHeight = imageToDraw.naturalHeight;
    
            if (sourceAspectRatio > destAspectRatio) {
                sWidth = imageToDraw.naturalHeight * destAspectRatio;
                sx = (imageToDraw.naturalWidth - sWidth) / 2;
            } else {
                sHeight = imageToDraw.naturalWidth / destAspectRatio;
                sy = (imageToDraw.naturalHeight - sHeight) / 2;
            }
            
            ctx.drawImage(
                imageToDraw, 
                sx, sy, sWidth, sHeight,
                -destWidthPx / 2, -destHeightPx / 2, destWidthPx, destHeightPx
            );
    
            if (addBorder && borderWidth > 0) {
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = mmToPx(borderWidth);
                ctx.strokeRect(-destWidthPx / 2, -destHeightPx / 2, destWidthPx, destHeightPx);
            }
            ctx.restore();
        }
        return canvas;
    }, [paper, margins, placedPhotos, sourceImages, addBorder, borderWidth, borderColor]);
    
    const handleDownload = async () => {
        setIsPreparingPrint(true);
        const canvas = await generateLayoutCanvas();
        if(!canvas) {
            setIsPreparingPrint(false);
            return;
        };

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `print-layout-${paperSizeKey}.png`;
        link.click();
        setIsPreparingPrint(false);
    };

    const prepareAndShowPrintModal = async () => {
        setIsPreparingPrint(true);
        const canvas = await generateLayoutCanvas();
        if (!canvas) {
            alert('Không thể tạo layout để in.');
            setIsPreparingPrint(false);
            return;
        }
        setPrintPreviewUrl(canvas.toDataURL('image/png'));
        setIsPreviewModalOpen(true);
        setIsPreparingPrint(false);
    };
    
    const executePrint = useCallback(() => {
        if (!printPreviewUrl) {
            alert("Không có nội dung để in.");
            return;
        }
    
        setIsPreviewModalOpen(false);
    
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        if (!printWindow) {
            alert("Không thể mở cửa sổ in. Vui lòng tắt trình chặn pop-up cho trang web này và thử lại.");
            return;
        }
    
        const printHTML = `
            <html>
                <head>
                    <title>In ảnh - KHOI PHUC ANH CU</title>
                    <style>
                        @page {
                            size: ${paper.widthMM}mm ${paper.heightMM}mm;
                            margin: 0;
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        body {
                            width: ${paper.widthMM}mm;
                            height: ${paper.heightMM}mm;
                        }
                        img {
                            width: 100%;
                            height: 100%;
                            display: block;
                        }
                    </style>
                </head>
                <body>
                    <img id="print-image" />
                </body>
            </html>
        `;
    
        const printDoc = printWindow.document;
        printDoc.open();
        printDoc.write(printHTML);
        printDoc.close();
    
        const img = printDoc.getElementById('print-image') as HTMLImageElement;
    
        const performPrint = () => {
            try {
                printWindow.focus();
                printWindow.print();
            } catch (e) {
                console.error("Lỗi khi gọi lệnh in:", e);
                alert("Đã xảy ra lỗi khi cố gắng in. Vui lòng thử lại.");
            } finally {
                setTimeout(() => {
                    if (!printWindow.closed) {
                        printWindow.close();
                    }
                }, 500);
            }
        };
        
        img.onload = performPrint;
    
        img.onerror = () => {
            alert("Không thể tải hình ảnh để in. Vui lòng thử lại.");
            if (!printWindow.closed) {
                printWindow.close();
            }
        };
    
        img.src = printPreviewUrl;
    
        if (img.complete) {
            performPrint();
        }
    
    }, [printPreviewUrl, paper.widthMM, paper.heightMM]);


    const handlePaperSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPaperSizeKey(e.target.value as PaperSizeKey);
        setPlacedPhotos([]);
    };

    useEffect(() => {
        const calculateScale = () => {
            if (previewContainerRef.current) {
                const containerWidth = previewContainerRef.current.clientWidth - 40;
                const containerHeight = previewContainerRef.current.clientHeight - 40;
                const scaleX = containerWidth / paper.widthMM;
                const scaleY = containerHeight / paper.heightMM;
                setPreviewScale(Math.max(0.1, Math.min(scaleX, scaleY, 5)));
            }
        };
        calculateScale();
        const resizeObserver = new ResizeObserver(calculateScale);
        if (previewContainerRef.current) resizeObserver.observe(previewContainerRef.current);
        return () => resizeObserver.disconnect();
    }, [paper]);
    
    const singleSourceImage = sourceImages.length > 0 ? sourceImages[0] : null;

    return (
        <div className="bg-[#10172A] w-full h-full flex flex-col page-enter-animation">
            <CustomerImagePicker isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} onImageSelect={handleImageSelectFromPicker} currentUser={currentUser} />
            <PrintPreviewModal
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                onPrint={executePrint}
                previewImage={printPreviewUrl}
                paperName={paper.name}
            />
            <input ref={uploadInputRef} type="file" multiple accept="image/*" onChange={handleLocalImageUpload} className="hidden" />
            
            <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
                <div className="lg:col-span-4 xl:col-span-3 lg:h-full flex flex-col bg-[#1E293B] p-4 rounded-xl shadow-lg">
                    <div className="overflow-y-auto flex-grow pr-2 -mr-4 space-y-4">
                        <div>
                            <h4 className="text-md font-semibold text-slate-300">1. Chọn khổ giấy</h4>
                            <select value={paperSizeKey} onChange={handlePaperSizeChange} className="w-full bg-slate-700 border-slate-600 rounded-md px-3 py-2 text-sm mt-2">{Object.entries(PAPER_SIZES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select>
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-md font-semibold text-slate-300">Chế độ xếp ảnh</h4>
                             <div className="grid grid-cols-2 gap-1 bg-slate-800 rounded-md p-1">
                                <button onClick={() => setMode('auto')} className={`px-2 py-1 text-sm rounded ${mode === 'auto' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-700'}`}>Tự động</button>
                                <button onClick={() => setMode('manual')} className={`px-2 py-1 text-sm rounded ${mode === 'manual' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-700'}`}>Thủ công</button>
                            </div>
                        </div>

                        {mode === 'auto' ? (
                            <fieldset disabled={!singleSourceImage} className="space-y-4 disabled:opacity-50">
                                <h4 className="text-md font-semibold text-slate-300">2. Tự động lấp đầy</h4>
                                {!singleSourceImage && <p className="text-xs text-center text-slate-400 bg-slate-800 p-2 rounded-md">Vui lòng quay lại và tạo một ảnh thẻ trước.</p>}
                                <div className="space-y-2">
                                    <button onClick={() => handleAutoLayout(['2x3'])} className="w-full bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm">Lấp đầy với ảnh 2x3 cm</button>
                                    <button onClick={() => handleAutoLayout(['3x4'])} className="w-full bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm">Lấp đầy với ảnh 3x4 cm</button>
                                    <button onClick={() => handleAutoLayout(['4x6'])} className="w-full bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm">Lấp đầy với ảnh 4x6 cm</button>
                                    <button onClick={() => handleAutoLayout(['2x3', '3x4'])} className="w-full bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm">Xếp chung 2x3 & 3x4 cm</button>
                                    <button onClick={() => handleAutoLayout(['3x4', '4x6'])} className="w-full bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm">Xếp chung 3x4 & 4x6 cm</button>
                                    <button onClick={() => handleAutoLayout(['2x3', '3x4', '4x6'])} className="w-full bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm">Xếp chung cả 3 loại</button>
                                </div>
                            </fieldset>
                        ) : ( 
                            <div className="space-y-4 pt-4 border-t border-slate-700">
                                <h4 className="text-md font-semibold text-slate-300">2. Khu vực chờ & Thêm ảnh</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setIsPickerOpen(true)} className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm font-semibold">
                                        <UsersIcon className="w-4 h-4" />
                                        <span>Từ Khách hàng</span>
                                    </button>
                                    <button onClick={() => uploadInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm font-semibold">
                                        <UploadIcon className="w-4 h-4" />
                                        <span>Từ Máy tính</span>
                                    </button>
                                </div>
                                {sourceImages.length === 0 ? <p className="text-xs text-slate-400 text-center">Chọn ảnh để bắt đầu.</p> :
                                <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2 -mr-2">
                                    {sourceImages.map(img => (
                                    <div key={img.id} className="bg-slate-800 p-3 rounded-lg space-y-3">
                                        <div className="flex items-start gap-3">
                                            <img src={img.thumbnailDataUrl} alt="source" className="w-12 h-16 object-cover rounded-md flex-shrink-0" />
                                            <div className="flex-grow space-y-2 text-xs">
                                                <p className="font-semibold text-slate-200 truncate">{img.customerName || 'Ảnh mới'}</p>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleChangeBackground(img.id, 'white')} disabled={!!isLoadingVariant[String(img.id)]} className="bg-slate-600 px-2 py-1 rounded hover:bg-slate-500 disabled:opacity-50 disabled:cursor-wait">
                                                        {isLoadingVariant[String(img.id)] === 'white' ? '...' : 'Nền Trắng'}
                                                    </button>
                                                     <button onClick={() => handleChangeBackground(img.id, 'blue')} disabled={!!isLoadingVariant[String(img.id)]} className="bg-slate-600 px-2 py-1 rounded hover:bg-slate-500 disabled:opacity-50 disabled:cursor-wait">
                                                        {isLoadingVariant[String(img.id)] === 'blue' ? '...' : 'Nền Xanh'}
                                                    </button>
                                                </div>
                                            </div>
                                            <button onClick={() => removeImageFromStaging(img.id)} className="text-slate-500 hover:text-red-400 p-1"><Trash2Icon className="w-5 h-5" /></button>
                                        </div>
                                        <div className="space-y-2">
                                            {Object.entries(PHOTO_SIZES).map(([sizeKey, sizeInfo]) => {
                                                const count = placedPhotos.filter(p => p.sourceId === img.id && p.sizeKey === sizeKey).length;
                                                return (
                                                    <div key={sizeKey} className="flex items-center justify-between bg-slate-700/50 p-2 rounded-md">
                                                        <span className="text-sm font-medium text-slate-300">{sizeInfo.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => removeOnePhotoFromLayout(img.id, sizeKey as PhotoSizeKey)}
                                                                disabled={count === 0}
                                                                className="w-7 h-7 bg-slate-600 rounded-md font-bold text-lg hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                aria-label={`Bớt ảnh ${sizeInfo.name}`}
                                                            >
                                                                -
                                                            </button>
                                                            <span className="w-8 text-center font-mono text-lg text-slate-200">{count}</span>
                                                            <button 
                                                                onClick={() => addPhotoToLayout(img.id, sizeKey as PhotoSizeKey)}
                                                                className="w-7 h-7 bg-cyan-600 rounded-md font-bold text-lg text-white hover:bg-cyan-500"
                                                                aria-label={`Thêm ảnh ${sizeInfo.name}`}
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    ))}
                                </div>
                                }
                            </div>
                        )}

                        <div className="space-y-3 pt-4 border-t border-slate-700">
                            <h4 className="text-md font-semibold text-slate-300">3. Tùy chỉnh lề & khoảng cách</h4>
                            <div className="flex justify-end"><label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={linkedMargins} onChange={e => setLinkedMargins(e.target.checked)} /> Liên kết các lề</label></div>
                            <div className="space-y-2 text-sm">
                                {(['top', 'bottom', 'left', 'right'] as const).map(side => (
                                    <div key={side} className="grid grid-cols-4 items-center gap-2">
                                        <label className="text-slate-400 capitalize col-span-1">{`Lề ${side}`}</label>
                                        <input type="range" min="0" max="50" value={margins[side]} onChange={e => handleMarginChange(side, Number(e.target.value))} className="w-full col-span-2" />
                                        <input type="number" value={margins[side]} onChange={e => handleMarginChange(side, Number(e.target.value))} className="w-full bg-slate-800 border-slate-600 rounded px-2 py-1 text-xs text-center" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-700">
                             <h4 className="text-md font-semibold text-slate-300">Tùy chỉnh ảnh</h4>
                             <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-4 items-center gap-2">
                                    <label className="text-slate-400 col-span-1">Khoảng cách</label>
                                    <input type="range" min="0" max="10" step="0.5" value={spacing} onChange={e => setSpacing(Number(e.target.value))} className="w-full col-span-2" />
                                    <input type="number" value={spacing} onChange={e => setSpacing(Number(e.target.value))} className="w-full bg-slate-800 border-slate-600 rounded px-2 py-1 text-xs text-center" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-slate-400">Thêm viền ảnh</label>
                                    <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors cursor-pointer ${addBorder ? 'bg-cyan-500' : 'bg-slate-600'}`} onClick={() => setAddBorder(p => !p)}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${addBorder ? 'translate-x-6' : 'translate-x-1'}`}/></div>
                                </div>
                                {addBorder && <>
                                <div className="grid grid-cols-4 items-center gap-2">
                                    <label className="text-slate-400 col-span-1">Độ dày viền</label>
                                    <input type="range" min="0.1" max="5" step="0.1" value={borderWidth} onChange={e => setBorderWidth(Number(e.target.value))} className="w-full col-span-2" />
                                    <input type="number" value={borderWidth} onChange={e => setBorderWidth(Number(e.target.value))} className="w-full bg-slate-800 border-slate-600 rounded px-2 py-1 text-xs text-center" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-2">
                                    <label className="text-slate-400 col-span-1">Màu viền</label>
                                    <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} className="w-full col-span-3 h-8 p-1 bg-slate-800 border-slate-600 rounded cursor-pointer" />
                                </div>
                                </>}
                             </div>
                        </div>

                    </div>
                     <div className="mt-auto flex-shrink-0 pt-4 border-t border-slate-700 grid grid-cols-2 gap-3">
                        <button onClick={handleDownload} disabled={isPreparingPrint || placedPhotos.length === 0} className="w-full flex items-center justify-center gap-2 bg-slate-700 px-4 py-3 rounded-md text-base font-semibold hover:bg-slate-600 disabled:opacity-50">
                          {isPreparingPrint ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <DownloadIcon className="w-5 h-5" />}
                           Tải Layout
                        </button>
                        <button onClick={prepareAndShowPrintModal} disabled={isPreparingPrint || placedPhotos.length === 0} className="w-full flex items-center justify-center gap-2 bg-cyan-500 text-white px-4 py-3 rounded-md text-base font-bold hover:bg-cyan-600 disabled:opacity-50">
                           {isPreparingPrint ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <PrinterIcon className="w-5 h-5" />}
                           In ảnh
                        </button>
                    </div>
                </div>

                <div id="printable-paper-wrapper" ref={previewContainerRef} className="lg:col-span-8 xl:col-span-9 lg:h-full flex items-center justify-center bg-slate-900/50 rounded-lg p-4 min-w-0 min-h-0">
                    <div id="printable-paper" className="relative bg-white shadow-lg" style={{ width: `${paper.widthMM * previewScale}px`, height: `${paper.heightMM * previewScale}px` }}>
                        {placedPhotos.map(p => {
                            const source = sourceImages.find(s => s.id === p.sourceId);
                            if (!source) return null;
                            const { width: effectiveWidthMM, height: effectiveHeightMM } = getEffectiveDimensions(p);
                            return (
                                <div key={p.instanceId} className="absolute group" style={{
                                    left: `${(margins.left + p.x) * previewScale}px`,
                                    top: `${(margins.top + p.y) * previewScale}px`,
                                    width: `${effectiveWidthMM * previewScale}px`,
                                    height: `${effectiveHeightMM * previewScale}px`,
                                    boxSizing: 'content-box',
                                    border: addBorder ? `${borderWidth * previewScale}px solid ${borderColor}` : 'none'
                                }}>
                                    <img src={source.imageDataUrl} className="w-full h-full object-cover" alt="" draggable="false" style={{ transform: `rotate(${p.rotation}deg)` }} />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2" style={{transform: `rotate(${-p.rotation}deg)`}}>
                                        <button onClick={() => rotatePhotoInLayout(p.instanceId)} title="Xoay" className="bg-slate-700/80 hover:bg-slate-600 text-white rounded-full p-2"><RotateCwIcon className="w-4 h-4" /></button>
                                        <button onClick={() => removePhotoFromLayout(p.instanceId)} title="Xóa" className="bg-red-600/80 hover:bg-red-500 text-white rounded-full p-2"><Trash2Icon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PrintLayoutPage;