import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { UploadIcon } from './icons/UploadIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { findSchoolLogo } from '../services/geminiService';

declare const html2canvas: any;

interface StudentCardPageProps {
  onNavigateBack: () => void;
}

const Barcode = ({ value }: { value: string }) => {
  const hash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h;
  };

  if (!value) {
    return <div className="flex h-16 items-stretch bg-gray-200" />;
  }

  const pattern = Array.from({ length: 60 }, (_, i) => 
    (hash(value + i) % 3) + 1
  );

  return (
    <div className="flex h-16 items-stretch overflow-hidden">
      {pattern.map((width, i) => (
        <div key={i} className="bg-black" style={{ width: `${width}px` }} />
      ))}
    </div>
  );
};

const StudentCardPage: React.FC<StudentCardPageProps> = ({ onNavigateBack }) => {
  const [info, setInfo] = useState({
    schoolName: 'ĐẠI HỌC KINH TẾ QUỐC DÂN',
    address: '207 Giải Phóng, Phường Mai, Đống Đa, Hà Nội, Việt Nam',
    cardTitle: 'THẺ SINH VIÊN',
    fullName: 'TRẦN ANH TIẾN',
    studentId: 'CHEM258823',
    dob: '15/06/2001',
    expiry: '21/09/2032',
    department: 'Hóa học',
    course: '2025 - 2032',
    class: 'MBA-2025-O',
    logoUrl: 'https://i.imgur.com/xR1t4h4.png',
    photoUrl: 'https://i.imgur.com/8c2Cxze.jpeg',
    primaryColor: '#84cc16', // lime-500
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const [isLogoSearching, setIsLogoSearching] = useState(false);
  const [logoSearchError, setLogoSearchError] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);


  const handleLogoSearch = useCallback(async () => {
    if (!info.schoolName) return;
    
    setIsLogoSearching(true);
    setLogoSearchError(null);
    try {
        const result = await findSchoolLogo(info.schoolName);
        if (result.logoUrl) {
           try {
                const response = await fetch(result.logoUrl);
                if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    setInfo(prev => ({ ...prev, logoUrl: reader.result as string }));
                };
                reader.onerror = () => {
                    setLogoSearchError("Không thể đọc file logo.");
                };
                reader.readAsDataURL(blob);
            } catch (fetchError) {
                console.error("Error fetching logo URL:", fetchError);
                setLogoSearchError("Không thể tải logo từ URL. Vui lòng thử tải lên thủ công.");
            }
        } else if (result.error) {
           setLogoSearchError(result.error);
        }
    } catch (err) {
        console.error("Failed to find logo:", err);
        const errorMessage = err instanceof Error ? err.message : "Lỗi không xác định khi tìm logo.";
        setLogoSearchError(`Lỗi: ${errorMessage}`);
    } finally {
        setIsLogoSearching(false);
    }
  }, [info.schoolName]);
  
  useEffect(() => {
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      // Don't search for the default value
      if (info.schoolName && info.schoolName !== 'ĐẠI HỌC KINH TẾ QUỐC DÂN' && info.schoolName.length > 5) {
        handleLogoSearch();
      }
    }, 1500); // 1.5 second debounce

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [info.schoolName, handleLogoSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'photoUrl') => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setInfo(prev => ({ ...prev, [field]: event.target?.result as string }));
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleDownload = () => {
    if (cardRef.current) {
      html2canvas(cardRef.current, {
        scale: 4,
        useCORS: true,
        backgroundColor: null,
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = `the-sinh-vien-${info.studentId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    }
  };

  const renderInputField = (label: string, name: keyof typeof info, placeholder: string) => (
    <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>
        <div className="relative">
            <input
                type="text"
                name={name}
                value={info[name]}
                onChange={handleInputChange}
                placeholder={placeholder}
                className={`w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 ${name === 'schoolName' ? 'pr-10' : ''}`}
            />
            {name === 'schoolName' && isLogoSearching && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="animate-spin h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            )}
        </div>
        {name === 'schoolName' && logoSearchError && (
            <p className="text-xs text-amber-400 mt-1">{logoSearchError}</p>
        )}
    </div>
  );
  
  const renderFileUpload = (label: string, name: 'logoUrl' | 'photoUrl', currentUrl: string | null) => (
     <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>
        <div className="flex items-center gap-3">
             <div className="w-12 h-12 flex-shrink-0 bg-white rounded-md p-1 flex items-center justify-center">
                {isLogoSearching && name === 'logoUrl' ? (
                    <svg className="animate-spin h-6 w-6 text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    currentUrl && <img src={currentUrl} alt="Preview" className="w-full h-full object-contain" />
                )}
            </div>
            <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, name)}
                className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-600 file:text-cyan-400 hover:file:bg-slate-500"
            />
        </div>
     </div>
  );

  return (
    <div className="bg-[#10172A] w-full h-full flex flex-col page-enter-animation">
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 min-h-0 overflow-y-auto">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-4 lg:h-full flex flex-col bg-[#1E293B] p-4 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex-shrink-0">Nhập thông tin thẻ</h3>
          <div className="overflow-y-auto flex-grow pr-2 -mr-4 space-y-4">
            <h4 className="text-md font-semibold text-slate-300 border-b border-slate-700 pb-2">Thông tin trường/tổ chức</h4>
            {renderInputField('Tên trường/tổ chức', 'schoolName', 'Đại học Kinh tế Quốc dân')}
            {renderInputField('Địa chỉ', 'address', '207 Giải Phóng...')}
            {renderInputField('Tiêu đề thẻ', 'cardTitle', 'THẺ SINH VIÊN')}
            {renderFileUpload('Logo', 'logoUrl', info.logoUrl)}

            <h4 className="text-md font-semibold text-slate-300 border-b border-slate-700 pb-2 pt-2">Thông tin cá nhân</h4>
            {renderFileUpload('Ảnh chân dung', 'photoUrl', info.photoUrl)}
            {renderInputField('Họ tên', 'fullName', 'TRẦN ANH TIẾN')}
            {renderInputField('Mã số', 'studentId', 'CHEM258823')}
            {renderInputField('Ngày sinh', 'dob', '15/06/2001')}
            {renderInputField('Hết hạn', 'expiry', '21/09/2032')}
            {renderInputField('Khoa/Phòng ban', 'department', 'Hóa học')}
            {renderInputField('Khóa học', 'course', '2025 - 2032')}
            {renderInputField('Lớp', 'class', 'MBA-2025-O')}
            
            <h4 className="text-md font-semibold text-slate-300 border-b border-slate-700 pb-2 pt-2">Thiết kế</h4>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Màu chủ đạo</label>
              <input
                type="color"
                name="primaryColor"
                value={info.primaryColor}
                onChange={handleInputChange}
                className="w-full h-10 p-1 bg-slate-700 border border-slate-600 rounded-md cursor-pointer"
              />
            </div>
          </div>
          <button onClick={handleDownload} className="w-full mt-4 bg-cyan-500 text-white px-4 py-3 rounded-md text-base font-bold hover:bg-cyan-600 flex items-center justify-center gap-2">
            <DownloadIcon className="w-5 h-5" /> Tải thẻ về máy
          </button>
        </div>
        
        {/* Right Panel - Preview */}
        <div className="lg:col-span-8 lg:h-full flex flex-col items-center justify-center bg-slate-900/50 rounded-lg p-4">
            <div
                ref={cardRef}
                className="w-[520px] bg-white rounded-2xl shadow-2xl text-gray-800 font-sans overflow-hidden flex flex-col"
                style={{ fontFamily: "'Helvetica Neue', 'Arial', sans-serif" }}
            >
                {/* Header */}
                <div className="p-4 flex items-center gap-4" style={{ backgroundColor: info.primaryColor }}>
                    {info.logoUrl && <img src={info.logoUrl} alt="Logo" className="w-16 h-16 rounded-full bg-white p-1 border-2 border-white" />}
                    <div className="text-white">
                        <h1 className="font-bold text-2xl uppercase tracking-wide">{info.schoolName}</h1>
                        <p className="text-xs font-medium">{info.address}</p>
                    </div>
                    <p className="ml-auto text-white font-semibold text-sm self-end">{info.cardTitle}</p>
                </div>

                {/* Body */}
                <div className="flex-grow p-4 flex gap-4 relative">
                    {info.logoUrl && (
                        <img src={info.logoUrl} alt="Watermark" className="absolute inset-0 m-auto w-2/3 h-2/3 object-contain opacity-10 pointer-events-none" />
                    )}
                    {/* Left side */}
                    <div className="flex flex-col items-center gap-2 w-1/3 z-10">
                        {info.photoUrl ? (
                            <img src={info.photoUrl} alt="Portrait" className="w-full aspect-[3/4] object-cover rounded-lg border-2 border-gray-200" />
                        ) : (
                            <div className="w-full aspect-[3/4] bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">Ảnh</div>
                        )}
                        <div className="text-center p-2 bg-gray-100 rounded-md w-full text-xs">
                            <p><strong className="font-semibold">Khóa học:</strong> {info.course}</p>
                            <p><strong className="font-semibold">Lớp:</strong> {info.class}</p>
                        </div>
                    </div>

                    {/* Right side */}
                    <div className="w-2/3 flex z-10">
                        <div className="flex flex-col gap-3 text-sm flex-grow">
                            <div className="grid grid-cols-4 items-baseline">
                                <span className="font-semibold text-gray-500 col-span-1">HỌ TÊN :</span>
                                <span className="font-bold text-lg col-span-3">{info.fullName}</span>
                            </div>
                            <div className="grid grid-cols-4 items-baseline">
                                <span className="font-semibold text-gray-500 col-span-1">MÃ SINH VIÊN :</span>
                                <span className="font-mono text-base col-span-3">{info.studentId}</span>
                            </div>
                            <div className="grid grid-cols-4 items-baseline">
                                <span className="font-semibold text-gray-500 col-span-1">NGÀY SINH :</span>
                                <span className="font-mono text-base col-span-3">{info.dob}</span>
                            </div>
                            <div className="grid grid-cols-4 items-baseline">
                                <span className="font-semibold text-gray-500 col-span-1">HẾT HẠN :</span>
                                <span className="font-mono text-base col-span-3">{info.expiry}</span>
                            </div>
                             <div className="grid grid-cols-4 items-baseline">
                                <span className="font-semibold text-gray-500 col-span-1 uppercase">Department :</span>
                                <span className="text-base font-semibold col-span-3">{info.department}</span>
                            </div>
                        </div>
                        <div className="w-[40px] flex-shrink-0 flex items-center justify-center">
                            <Barcode value={info.studentId} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StudentCardPage;