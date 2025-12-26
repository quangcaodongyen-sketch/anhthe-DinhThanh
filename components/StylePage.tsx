import React, { useState, useEffect, useRef } from 'react';
import { mimicImageStyle, generateStyledImageFromPrompt, changeSubjectBackground } from '../services/geminiService';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { UploadIcon } from './icons/UploadIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { MagicWandIcon } from './icons/MagicWandIcon';
import { BackgroundIcon } from './icons/BackgroundIcon';

const fileToBase64 = (file: File | Blob): Promise<{ data: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const mimeType = result.substring(5, result.indexOf(';'));
            const data = result.split(',')[1];
            resolve({ data, mimeType });
        };
        reader.onerror = error => reject(error);
    });
};

interface ImageUploaderProps {
    title: string;
    description: string;
    onImageUpload: (file: File | null) => void;
    previewUrl: string | null;
}

const Uploader: React.FC<ImageUploaderProps> = ({ title, description, onImageUpload, previewUrl }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImageUpload(e.target.files[0]);
        }
    };

    return (
        <div className="bg-slate-800 p-4 rounded-lg">
            {title && <h4 className="text-md font-semibold text-slate-300">{title}</h4>}
            {description && <p className="text-xs text-slate-500 mb-3">{description}</p>}
            <div
                onClick={() => inputRef.current?.click()}
                className="relative group flex justify-center items-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-slate-900/50 border-slate-600 hover:border-cyan-500"
            >
                {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="object-contain h-full w-full rounded-md p-1" />
                ) : (
                    <div className="text-center text-slate-400">
                        <UploadIcon className="mx-auto h-8 w-8 mb-1" />
                        <p className="text-sm font-semibold">Tải ảnh lên</p>
                    </div>
                )}
            </div>
            <input type="file" accept="image/*" ref={inputRef} onChange={handleFileChange} className="hidden" />
        </div>
    );
};

const PRESETS: { [key: string]: { name: string, prompt: string }[] } = {
    'Phong cảnh & Môi trường': [
        { name: 'Phông đỏ Studio', prompt: "Một bức ảnh studio thời trang cao cấp với phông nền màu đỏ thẫm rực rỡ. Ánh sáng ấn tượng và tập trung, tạo ra một không khí tinh tế và táo bạo. Trang phục thanh lịch, phù hợp cho một đám cưới hiện đại, sang trọng." },
        { name: 'Phông trắng Studio', prompt: "Một bức ảnh studio tối giản, sạch sẽ với phông nền trắng tinh không tì vết. Ánh sáng tươi sáng, mềm mại và thoáng đãng, tạo nên vẻ ngoài cổ điển và vượt thời gian. Trang phục của cặp đôi phải sắc nét và thanh lịch, nhấn mạnh sự đơn giản và duyên dáng." },
        { name: 'Phông đen Studio', prompt: "Một bức chân dung studio ấn tượng, tối giản với phông nền đen sâu thẳm. Ánh sáng có tâm trạng và định hướng, giống như tranh của Rembrandt, tách biệt chủ thể khỏi bóng tối, làm nổi bật các đường nét và cảm xúc. Không khí thân mật và mạnh mẽ." },
        { name: 'Song hỷ', prompt: "Một khung cảnh đám cưới hiện đại, lễ hội trong một ngôi nhà đủ ánh sáng. Phông nền nổi bật với biểu tượng Song Hỷ ('囍') lớn bằng nhung đỏ sang trọng. Khu vực được trang trí bằng nhiều giỏ hoa với hoa màu đỏ, hồng, xanh lá và cánh hoa hồng rải trên sàn. Ánh sáng ấm áp và tự nhiên, tạo ra một không khí lãng mạn và cao cấp. Trang phục cưới phải thanh lịch: một chiếc váy cưới màu trắng tinh khôi, tinh xảo với chân váy bồng bềnh như trong truyện cổ tích cho cô dâu và một bộ tuxedo đen cổ điển cho chú rể. Phong cách phải chi tiết, màu sắc phong phú và độ tương phản cao, tạo ra một bức ảnh chất lượng tuyệt tác." },
        { name: 'Cảnh biển', prompt: 'Một bức ảnh lãng mạn, ngập tràn ánh nắng chụp trên một bãi biển nhiệt đới hoang sơ lúc hoàng hôn. Phông nền có những con sóng nhẹ nhàng, bãi cát trắng và bầu trời được tô điểm bởi những sắc màu ấm áp của cam, hồng và vàng. Cặp đôi mặc trang phục nhẹ nhàng, bay bổng, tạo nên một khung cảnh thư thái và tuyệt đẹp.' },
        { name: 'Vườn hoa', prompt: "Một bức ảnh rực rỡ được chụp trong một khu vườn bách thảo tươi tốt, đang nở rộ. Phông nền tràn ngập tấm thảm phong phú của các loài hoa đầy màu sắc và cây xanh mướt. Ánh sáng mềm mại và tự nhiên, như trong một ngày xuân hoàn hảo, tạo ra một không khí lãng mạn và giống như trong truyện cổ tích." },
        { name: 'Lâu đài', prompt: 'Một bức ảnh hùng vĩ và hoành tráng được chụp trước một lâu đài cổ kính, hoành tráng của châu Âu. Phông nền thể hiện kiến trúc tuyệt đẹp, những bức tường đá và có thể là một khung cảnh bao quát. Ánh sáng mang tính điện ảnh và hoành tráng, phù hợp cho một đám cưới hoàng gia, cổ tích.' },
        { name: 'Trên núi', prompt: "Một cặp đôi mới cưới trên đỉnh núi với tầm nhìn toàn cảnh tuyệt đẹp. Cô dâu mặc một chiếc váy cưới màu trắng lộng lẫy, và chú rể mặc một bộ vest đen cổ điển. Phong cảnh có những ngọn núi xanh tươi dưới bầu trời xanh với những đám mây trắng mềm mại. Mặt đất là một thảm hoa dại trắng và cây xanh, tạo ra một không khí thanh bình, lãng mạn và mơ mộng của niềm hạnh phúc thuần khiết và vẻ đẹp tự nhiên." },
        { name: 'Bãi cỏ', prompt: "Một bức ảnh lãng mạn, độ phân giải cao của một cặp đôi trên đỉnh núi phủ cỏ. Khung cảnh được viền bởi những lẵng hoa trắng tươi tốt. Chú rể mặc một bộ tuxedo trắng cổ điển với nơ đen, và cô dâu mặc một chiếc váy cưới trắng lộng lẫy, bồng bềnh. Phông nền là một dãy núi hùng vĩ với những cây thường xanh rậm rạp dưới bầu trời xanh có mây rải rác. Không khí thanh bình và đẹp đẽ, ghi lại một khoảnh khắc hạnh phúc thuần khiết và vẻ đẹp tự nhiên." },
        { name: 'Biển lãng mạn', prompt: "Một khung cảnh lãng mạn và mơ mộng trên bãi biển. Cặp đôi ngồi trên một chiếc ghế dài được trang trí bằng cây xanh và những bông hồng phớt rải rác. Cô dâu mặc một chiếc váy dài màu trắng, và chú rể mặc một bộ vest trắng cổ điển. Cả hai đều cầm những bó hoa trắng và hồng. Phía sau, sóng biển vỗ vào bờ dưới bầu trời xanh trong." },
        { name: 'Hồ nước', prompt: "Một khung cảnh lãng mạn và yên bình trong một khu vườn truyền thống. Cặp đôi đứng trên một tảng đá lớn, nhẵn mịn giữa hồ nước trong vắt, cầm một chiếc ô màu trắng. Xung quanh hồ là cây xanh tươi tốt và những tảng đá phong hóa, với cá vàng nhẹ nhàng bơi lội trong nước. Không khí thanh bình và đầy yêu thương." },
        { name: 'Thuyền trong hồ', prompt: "Một khung cảnh yên bình và thanh thản của một cặp đôi trên một chiếc thuyền nhỏ, màu đen truyền thống có mái gỗ, trôi trên một hồ nước lặng. Họ đang đứng trên boong, đối mặt với nhau. Phông nền là một cảnh quan xanh tươi với cây cối dưới bầu trời xanh trong. Người phụ nữ nên mặc một chiếc váy dài màu xanh lá cây thanh lịch, và người đàn ông trong một bộ vest lịch lãm. Không khí chung là yên tĩnh và lãng mạn." },
        { name: 'Nhà gỗ', prompt: 'Một bức ảnh duyên dáng được chụp bên trong một nhà kho bằng gỗ mộc mạc được trang trí cho đám cưới. Phông nền được tô điểm bằng những dải đèn lấp lánh, những thanh xà gỗ lộ ra và những lẵng hoa dại. Ánh sáng ấm áp và thân mật, tạo ra một không khí ấm cúng và lãng mạn.' },
        { name: 'Toà nhà', prompt: 'Một bức ảnh tinh tế trên sân thượng của một toà nhà cao tầng nhìn ra đường chân trời thành phố rực rỡ lúc hoàng hôn. Phông nền là hiệu ứng bokeh tuyệt đẹp của ánh đèn thành phố. Bối cảnh hiện đại và sang trọng, tạo nên một khung cảnh đám cưới đô thị quyến rũ và thanh lịch.' },
        { name: 'Phòng Tiệc', prompt: 'Một bức ảnh sang trọng được chụp trong một phòng khiêu vũ lớn, lộng lẫy. Phông nền có những chiếc đèn chùm pha lê tráng lệ, trần nhà cao được trang trí công phu và một cầu thang rộng lớn. Ánh sáng tươi sáng và thanh lịch, tạo ra một không khí đám cưới cổ tích, vượt thời gian.' },
    ],
    'Ánh sáng & Màu sắc': [
        { name: 'Giờ vàng', prompt: 'Ánh sáng vàng ấm áp của giờ vàng (golden hour).' },
        { name: 'Cyberpunk', prompt: 'Ánh sáng neon rực rỡ của buổi đêm cyberpunk.' },
        { name: 'Màu phim cổ điển', prompt: 'Màu phim cổ điển, tông màu ấm và hơi mờ.' },
        { name: 'Đen trắng', prompt: 'Ảnh đen trắng nghệ thuật, độ tương phản cao.' },
        { name: 'Màu Ghibli', prompt: 'Màu sắc trong trẻo, tươi sáng như phim hoạt hình Ghibli.' },
        { name: 'Ánh sáng Rembrandt', prompt: 'Ánh sáng Rembrandt kịch tính (sáng một bên mặt).' },
    ],
    'Chất liệu & Hiệu ứng': [
        { name: 'Tranh sơn dầu', prompt: 'Vẽ theo phong cách tranh sơn dầu.' },
        { name: 'Tranh màu nước', prompt: 'Tranh màu nước mềm mại, loang màu.' },
        { name: 'Chồng ảnh', prompt: 'Hiệu ứng Double Exposure (chồng ảnh) với thiên nhiên.' },
        { name: 'Vỡ mảnh', prompt: 'Tan biến thành những mảnh vỡ hình học.' },
        { name: 'Khói & Sương mù', prompt: 'Hiệu ứng khói và sương mù ma mị.' },
    ],
    'Trang phục': [
        { name: 'Váy cưới lộng lẫy', prompt: 'Mặc một bộ váy cưới lộng lẫy, chi tiết tinh xảo.' },
        { name: 'Trang phục hoàng gia', prompt: 'Trang phục hoàng gia, quý tộc châu Âu thế kỷ 18.' },
        { name: 'Đồ phi hành gia', prompt: 'Bộ đồ phi hành gia hiện đại.' },
        { name: 'Chiến binh Samurai', prompt: 'Trang phục của một chiến binh samurai.' },
        { name: 'Áo dài hoa sen', prompt: 'Áo dài truyền thống Việt Nam với họa tiết hoa sen.' },
    ],
};

interface StylePageProps {
  onNavigateBack: () => void;
}

const StylePage: React.FC<StylePageProps> = ({ onNavigateBack }) => {
    const [mode, setMode] = useState<'mimic' | 'prompt' | 'background'>('mimic');
    
    const [subjectImageFile, setSubjectImageFile] = useState<File | null>(null);
    const [subjectImageUrl, setSubjectImageUrl] = useState<string | null>(null);
    
    const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
    const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
    
    const [promptText, setPromptText] = useState('');

    const [backgroundSource, setBackgroundSource] = useState<'prompt' | 'image' | 'color'>('prompt');
    const [backgroundPromptText, setBackgroundPromptText] = useState('');
    const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
    const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
    const [backgroundColor, setBackgroundColor] = useState<string>('#FFFFFF');

    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleImageUpload = (file: File | null, type: 'subject' | 'reference' | 'background') => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const url = reader.result as string;
                if (type === 'subject') {
                    setSubjectImageFile(file);
                    setSubjectImageUrl(url);
                } else if (type === 'reference') {
                    setReferenceImageFile(file);
                    setReferenceImageUrl(url);
                } else {
                    setBackgroundImageFile(file);
                    setBackgroundImageUrl(url);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setGeneratedImageUrl(null);

        try {
            if (mode === 'mimic') {
                if (!subjectImageFile || !referenceImageFile) {
                    throw new Error('Vui lòng tải lên cả hai ảnh: ảnh gốc và ảnh mẫu.');
                }
                const subjectImage = await fileToBase64(subjectImageFile);
                const referenceImage = await fileToBase64(referenceImageFile);
                
                const result = await mimicImageStyle(subjectImage, referenceImage);
                
                if (result.image) {
                    setGeneratedImageUrl(`data:image/png;base64,${result.image}`);
                } else {
                    throw new Error(result.error || 'Tạo ảnh thất bại.');
                }
            } else if (mode === 'prompt') {
                if (!subjectImageFile || !promptText.trim()) {
                    throw new Error('Vui lòng tải lên ảnh gốc và nhập mô tả.');
                }
                const subjectImage = await fileToBase64(subjectImageFile);
                const result = await generateStyledImageFromPrompt(subjectImage.data, subjectImage.mimeType, promptText);
                if (result.image) {
                    setGeneratedImageUrl(`data:image/png;base64,${result.image}`);
                } else {
                    throw new Error(result.error || 'Tạo ảnh thất bại.');
                }
            } else { // background mode
                 if (!subjectImageFile) {
                    throw new Error('Vui lòng tải lên ảnh gốc.');
                }
                const subjectImage = await fileToBase64(subjectImageFile);
                let result;

                if (backgroundSource === 'prompt') {
                    if (!backgroundPromptText.trim()) {
                        throw new Error('Vui lòng nhập mô tả cho nền mới.');
                    }
                    result = await changeSubjectBackground(subjectImage, { type: 'prompt', value: backgroundPromptText });
                } else if (backgroundSource === 'image') {
                    if (!backgroundImageFile) {
                        throw new Error('Vui lòng tải lên ảnh nền mới.');
                    }
                    const backgroundImage = await fileToBase64(backgroundImageFile);
                    result = await changeSubjectBackground(subjectImage, { type: 'image', value: backgroundImage });
                } else { // color
                     result = await changeSubjectBackground(subjectImage, { type: 'prompt', value: `a solid, uniform background of color ${backgroundColor}` });
                }

                if (result.image) {
                    setGeneratedImageUrl(`data:image/png;base64,${result.image}`);
                } else {
                    throw new Error(result.error || 'Thay nền thất bại.');
                }
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.';
            setError(`Lỗi: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownload = () => {
        if (generatedImageUrl) {
            const link = document.createElement('a');
            link.href = generatedImageUrl;
            link.download = `styled-ai-photo.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const canGenerate = (mode === 'mimic' && subjectImageUrl && referenceImageUrl) || 
                        (mode === 'prompt' && subjectImageUrl && promptText.trim()) ||
                        (mode === 'background' && subjectImageUrl && (
                            (backgroundSource === 'prompt' && backgroundPromptText.trim()) ||
                            (backgroundSource === 'image' && backgroundImageUrl) ||
                            (backgroundSource === 'color' && backgroundColor)
                        ));

    return (
        <div className="bg-[#10172A] w-full h-full flex flex-col page-enter-animation">
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
                <div className="lg:col-span-5 xl:col-span-4 lg:h-full flex flex-col bg-[#1E293B] p-4 rounded-xl shadow-lg">
                    <div className="grid grid-cols-3 gap-1 bg-slate-700 rounded-md p-1 mb-4 flex-shrink-0">
                        <button onClick={() => setMode('mimic')} className={`px-2 py-2 text-sm rounded font-semibold ${mode === 'mimic' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-600'}`}>Sao chép phong cách</button>
                        <button onClick={() => setMode('prompt')} className={`px-2 py-2 text-sm rounded font-semibold ${mode === 'prompt' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-600'}`}>Tạo theo văn bản</button>
                        <button onClick={() => setMode('background')} className={`px-2 py-2 text-sm rounded font-semibold flex items-center justify-center gap-1 ${mode === 'background' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-600'}`}><BackgroundIcon className="w-4 h-4" /> Thay nền</button>
                    </div>

                    <div className="overflow-y-auto flex-grow pr-2 -mr-4 space-y-6">
                        {mode === 'mimic' ? (
                            <>
                                <Uploader title="1. Ảnh gốc" description="Giữ lại khuôn mặt của người trong ảnh này." onImageUpload={(file) => handleImageUpload(file, 'subject')} previewUrl={subjectImageUrl} />
                                <Uploader title="2. Ảnh mẫu" description="Sao chép phong cách, màu sắc, ánh sáng từ ảnh này." onImageUpload={(file) => handleImageUpload(file, 'reference')} previewUrl={referenceImageUrl} />
                            </>
                        ) : mode === 'prompt' ? (
                            <>
                                <Uploader title="1. Ảnh gốc" description="Chủ thể trong ảnh sẽ được giữ nguyên." onImageUpload={(file) => handleImageUpload(file, 'subject')} previewUrl={subjectImageUrl} />
                                <div className="space-y-3">
                                    <h4 className="text-md font-semibold text-slate-300">2. Mô tả phong cách</h4>
                                    <textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} rows={5} className="w-full bg-slate-800 border border-slate-600 rounded-md p-3 text-sm focus:ring-2 focus:ring-cyan-500" placeholder="Ví dụ: một cặp đôi trong trang phục cưới, đứng giữa cánh đồng hoa oải hương lúc hoàng hôn, màu phim cổ điển..." />
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-md font-semibold text-slate-300">3. Gợi ý có sẵn (nhấn để thêm)</h4>
                                    {Object.entries(PRESETS).map(([category, prompts]) => (
                                        <div key={category}>
                                            <h5 className="text-sm font-semibold text-cyan-400 mb-2">{category}</h5>
                                            <div className="flex flex-wrap gap-2">
                                                {prompts.map(p => (
                                                    <button 
                                                        key={p.name} 
                                                        onClick={() => setPromptText(prev => prev ? `${prev.trim().replace(/\.$/, '')}. ${p.prompt}` : p.prompt)} 
                                                        className="bg-slate-700 text-slate-300 px-2 py-1 rounded-md text-xs hover:bg-slate-600 transition-colors"
                                                        title={p.prompt}
                                                    >
                                                        {p.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                           <>
                                <Uploader title="1. Ảnh gốc" description="Người trong ảnh sẽ được tách nền và giữ lại." onImageUpload={(file) => handleImageUpload(file, 'subject')} previewUrl={subjectImageUrl} />
                                <div className="space-y-3">
                                    <h4 className="text-md font-semibold text-slate-300">2. Nền mới</h4>
                                    <div className="grid grid-cols-3 gap-1 bg-slate-700 rounded-md p-1">
                                        <button onClick={() => setBackgroundSource('color')} className={`px-2 py-1 text-sm rounded ${backgroundSource === 'color' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-600'}`}>Màu trơn</button>
                                        <button onClick={() => setBackgroundSource('prompt')} className={`px-2 py-1 text-sm rounded ${backgroundSource === 'prompt' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-600'}`}>Mô tả</button>
                                        <button onClick={() => setBackgroundSource('image')} className={`px-2 py-1 text-sm rounded ${backgroundSource === 'image' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-600'}`}>Tải ảnh</button>
                                    </div>
                                    {backgroundSource === 'prompt' ? (
                                        <textarea value={backgroundPromptText} onChange={(e) => setBackgroundPromptText(e.target.value)} rows={3} className="w-full bg-slate-800 border border-slate-600 rounded-md p-3 text-sm focus:ring-2 focus:ring-cyan-500" placeholder="Ví dụ: đứng trên bãi biển lúc hoàng hôn..." />
                                    ) : backgroundSource === 'image' ? (
                                        <Uploader title="" description="Tải lên ảnh nền bạn muốn sử dụng." onImageUpload={(file) => handleImageUpload(file, 'background')} previewUrl={backgroundImageUrl} />
                                    ) : (
                                        <div className="flex items-center gap-3 p-2 bg-slate-800 rounded-lg">
                                            <input type="color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} className="w-12 h-12 p-1 bg-slate-700 border border-slate-600 rounded-md cursor-pointer" />
                                            <div className="grid grid-cols-3 gap-2 flex-grow">
                                                <button onClick={() => setBackgroundColor('#FFFFFF')} className="h-8 rounded border border-slate-500 bg-white" aria-label="Nền trắng"></button>
                                                <button onClick={() => setBackgroundColor('#007bff')} className="h-8 rounded border border-slate-500 bg-[#007bff]" aria-label="Nền xanh"></button>
                                                <button onClick={() => setBackgroundColor('#D1D5DB')} className="h-8 rounded border border-slate-500 bg-gray-300" aria-label="Nền xám"></button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                           </>
                        )}
                    </div>

                    <div className="mt-auto pt-6 flex-shrink-0">
                        {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
                        <button onClick={handleGenerate} disabled={!canGenerate || isLoading} className="w-full bg-cyan-500 text-white px-4 py-3 rounded-md text-base font-bold hover:bg-cyan-600 disabled:bg-cyan-800 disabled:text-cyan-400 disabled:cursor-not-allowed flex items-center justify-center">
                            {isLoading ? <><svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Đang tạo ảnh...</span></> : 'Tạo ảnh'}
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-7 xl:col-span-8 lg:h-full flex flex-col bg-[#1E293B] p-4 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <h3 className="text-lg font-semibold text-cyan-400">Kết quả</h3>
                        <button onClick={handleDownload} disabled={!generatedImageUrl || isLoading} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-md text-sm font-semibold disabled:opacity-50">
                            <DownloadIcon className="w-4 h-4" /> Tải về
                        </button>
                    </div>
                    <div className="flex-grow flex items-center justify-center bg-slate-900/50 rounded-lg relative">
                        {isLoading && (
                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 rounded-lg backdrop-blur-sm">
                                <svg className="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <p className="mt-4 text-lg text-white">AI đang phân tích và sáng tạo...</p>
                                <p className="text-sm text-slate-400 mt-2">Quá trình này có thể mất một vài phút.</p>
                            </div>
                        )}
                        {generatedImageUrl ? (
                            <img src={generatedImageUrl} alt="Generated" className="max-w-full max-h-full object-contain rounded-md" />
                        ) : (
                            !isLoading && <div className="text-center text-slate-500 p-8"><p className="font-semibold text-lg">Kết quả sẽ được hiển thị ở đây</p></div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StylePage;