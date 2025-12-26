import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { UsersIcon } from './icons/UsersIcon';
import { addCustomer, getAllCustomers, updateCustomer, deleteCustomer, CustomerRecord, getImagesForCustomer, ArchivedImage, exportAllData, importAllData, saveImage, LocalUser } from '../services/dbService';
import CustomerFormModal from './CustomerFormModal';
import { SendIcon } from './icons/SendIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { UploadIcon } from './icons/UploadIcon';
import { ExportIcon } from './icons/ExportIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';

interface CustomerHistoryPageProps {
  onNavigateBack: () => void;
  onLoadImage: (imageDataUrl: string) => void;
  currentUser: LocalUser;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};

const CustomerHistoryPage: React.FC<CustomerHistoryPageProps> = ({ onNavigateBack, onLoadImage, currentUser }) => {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [customerImages, setCustomerImages] = useState<Record<number, ArchivedImage[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [uploadingForCustomerId, setUploadingForCustomerId] = useState<number | null>(null);

  const fetchCustomers = useCallback(async () => {
    if (!currentUser.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAllCustomers(currentUser.id);
      setCustomers(data);
      const imagesByCustomer: Record<number, ArchivedImage[]> = {};
      for (const customer of data) {
        if (customer.id) {
          const images = await getImagesForCustomer(customer.id, currentUser.id);
          imagesByCustomer[customer.id] = images;
        }
      }
      setCustomerImages(imagesByCustomer);
    } catch (err) {
      console.error("Failed to load customers:", err);
      setError("Không thể tải danh sách khách hàng.");
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleOpenModal = (customer: CustomerRecord | null = null) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingCustomer(null);
    setIsModalOpen(false);
  };

  const handleSaveCustomer = async (
    customerData: Omit<CustomerRecord, 'id' | 'createdAt' | 'updatedAt' | 'userId'> | CustomerRecord,
    imageFile?: File | null
  ) => {
    if (!currentUser.id) return;
    try {
      let customerId: number;
      if ('id' in customerData) {
        await updateCustomer(customerData);
        customerId = customerData.id!;
      } else {
        const customerWithUser = { ...customerData, userId: currentUser.id };
        customerId = await addCustomer(customerWithUser);
      }
      
      if (imageFile && customerId) {
        const imageDataUrl = await fileToBase64(imageFile);
        // For a new upload, original and restored are the same
        await saveImage(imageDataUrl, imageDataUrl, currentUser.id, customerId);
      }

      fetchCustomers();
      handleCloseModal();
    } catch (err) {
      console.error("Failed to save customer:", err);
      setError("Lưu thông tin khách hàng thất bại.");
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!currentUser.id) return;
    if (window.confirm("Bạn có chắc chắn muốn xóa khách hàng này? Mọi thông tin sẽ bị mất vĩnh viễn.")) {
      try {
        await deleteCustomer(id, currentUser.id);
        fetchCustomers();
      } catch (err) {
        console.error("Failed to delete customer:", err);
        setError("Xóa khách hàng thất bại.");
      }
    }
  };
  
  const handleDownload = (image: ArchivedImage, customer: CustomerRecord) => {
    const link = document.createElement('a');
    link.href = image.imageDataUrl; // Use full-res image
    const sanitizedName = customer.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `khachhang_${sanitizedName}_${image.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUseImage = (image: ArchivedImage) => {
    onLoadImage(image.imageDataUrl); // Use full-res restored image
  };

  const handleExport = async () => {
    if (!currentUser.id) return;
    try {
        const jsonString = await exportAllData(currentUser.id);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        link.download = `photo_restore_backup_${currentUser.username}_${date}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Export failed", err);
        setError("Xuất dữ liệu thất bại.");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser.id) return;

    const confirmation = window.confirm(
      "BẠN CÓ CHẮC KHÔNG?\n\nViệc này sẽ THÊM dữ liệu từ tệp sao lưu vào tài khoản của bạn. Nó sẽ không xóa dữ liệu hiện có."
    );

    if (confirmation) {
        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonString = e.target?.result as string;
                await importAllData(jsonString, currentUser.id!);
                alert("Nhập dữ liệu thành công!");
                await fetchCustomers();
            } catch (err) {
                console.error("Import failed", err);
                setError(`Nhập dữ liệu thất bại: ${err instanceof Error ? err.message : 'Unknown error'}`);
                setLoading(false);
            }
        };
        reader.readAsText(file);
    }
    // Reset file input to allow importing the same file again
    event.target.value = '';
  };

  const handleTriggerUpload = (customerId: number) => {
    setUploadingForCustomerId(customerId);
    uploadInputRef.current?.click();
  };

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      const customerId = uploadingForCustomerId;
      
      if (uploadInputRef.current) {
          uploadInputRef.current.value = '';
      }

      if (!file || !customerId || !currentUser.id) {
          setUploadingForCustomerId(null);
          return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target?.result as string);
            reader.onerror = () => reject(new Error("Không thể đọc file ảnh."));
            reader.readAsDataURL(file);
        });
        
        await saveImage(dataUrl, dataUrl, currentUser.id, customerId);
        await fetchCustomers();
      } catch (err) {
          console.error("Failed to upload image:", err);
setError(err instanceof Error ? err.message : "Tải ảnh lên thất bại.");
          setLoading(false);
      } finally {
          setUploadingForCustomerId(null);
      }
  };

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    const lowercasedQuery = searchQuery.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(lowercasedQuery) ||
      c.phone.includes(lowercasedQuery)
    );
  }, [customers, searchQuery]);

  return (
    <div className="bg-[#10172A] w-full h-full flex flex-col page-enter-animation">
      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveCustomer}
        customer={editingCustomer}
        showUploader={!editingCustomer}
      />
      <input type="file" accept=".json" ref={importInputRef} onChange={handleImport} className="hidden" />
      <input type="file" accept="image/*" ref={uploadInputRef} onChange={handleImageFileChange} className="hidden" />

      <main className="flex-grow p-4 flex flex-col min-h-0">
        <div className="bg-sky-900/50 border border-sky-700 text-sky-200 px-4 py-3 rounded-lg relative mb-4 flex items-start gap-3">
            <InformationCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0 text-sky-400" />
            <div>
              <h4 className="font-bold">Dữ liệu của bạn được lưu trữ an toàn</h4>
              <p className="text-sm">
                Toàn bộ danh sách khách hàng và hình ảnh được lưu trực tiếp trên trình duyệt này. Để sao lưu vĩnh viễn hoặc chuyển dữ liệu sang máy khác, hãy sử dụng tính năng <strong>Sao lưu &amp; Phục hồi</strong> bên dưới.
              </p>
            </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
            <input 
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên hoặc SĐT..."
                className="w-full sm:w-auto flex-grow bg-slate-700 border border-slate-600 rounded-md px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <button onClick={() => handleOpenModal()} className="flex-1 bg-cyan-500 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-cyan-600">
                    Thêm mới
                </button>
            </div>
        </div>
        
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 mb-4">
            <h3 className="text-md font-semibold text-cyan-400 mb-2">Sao lưu &amp; Phục hồi (Cloud / Thủ công)</h3>
            <p className="text-xs text-slate-400 mb-4">
               Vì lý do bảo mật, ứng dụng không thể tự kết nối với Google Drive. Hãy làm theo các bước sau để sao lưu an toàn:
            </p>
            <div className="flex flex-col sm:flex-row items-stretch gap-4">
                <div className="flex-1 flex flex-col gap-2">
                    <span className="text-sm font-semibold text-slate-300">1. Tạo tệp sao lưu vào máy</span>
                    <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 bg-slate-600 text-slate-200 px-4 py-2 rounded-md text-sm font-semibold hover:bg-slate-500">
                        <DownloadIcon className="w-4 h-4" /> Tạo tệp sao lưu...
                    </button>
                </div>
                 <div className="flex-1 flex flex-col gap-2">
                    <span className="text-sm font-semibold text-slate-300">2. Tải tệp lên Cloud</span>
                     <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 bg-slate-600 text-slate-200 px-4 py-2 rounded-md text-sm font-semibold hover:bg-slate-500">
                        <UploadIcon className="w-4 h-4" /> Mở Google Drive & Tải tệp lên
                    </a>
                </div>
            </div>
             <div className="mt-4 pt-4 border-t border-slate-700">
                 <button onClick={() => importInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 bg-slate-700 text-slate-200 px-4 py-2 rounded-md text-sm font-semibold hover:bg-slate-600">
                    <ExportIcon className="w-4 h-4" /> Khôi phục từ tệp sao lưu...
                </button>
            </div>
        </div>

        {error && <div className="text-center text-red-400 p-4">{error}</div>}
        
        <div className="flex-grow overflow-y-auto bg-[#1E293B] rounded-lg border border-slate-800">
          {loading ? (
             <div className="flex justify-center items-center h-full"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center text-slate-500 p-8 flex flex-col items-center justify-center h-full">
                <UsersIcon className="w-16 h-16 mb-4 text-slate-600" />
                <h3 className="text-xl font-semibold text-slate-400">
                    {searchQuery ? 'Không tìm thấy khách hàng' : 'Chưa có khách hàng nào'}
                </h3>
                <p className="mt-2 max-w-md">
                    {searchQuery ? 'Hãy thử một từ khóa khác.' : 'Nhấn nút "Thêm mới" để bắt đầu hoặc "Khôi phục" để tải lên dữ liệu.'}
                </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {filteredCustomers.map(customer => {
                const images = customerImages[customer.id!] || [];
                return (
                <div key={customer.id} className="p-4 hover:bg-slate-700/50 transition-colors duration-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                      <div>
                        <h4 className="font-bold text-lg text-slate-200">{customer.name}</h4>
                        <p className="text-sm text-cyan-400 font-mono">{customer.phone}</p>
                        <p className="text-xs text-slate-500 mt-1">Cập nhật lần cuối: {new Date(customer.updatedAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-shrink-0">
                          <button onClick={() => handleTriggerUpload(customer.id!)} className="flex items-center gap-1 bg-slate-600 text-slate-200 px-3 py-1 rounded-md text-xs font-semibold hover:bg-slate-500">
                            <UploadIcon className="w-3 h-3"/> Tải ảnh
                          </button>
                          <button onClick={() => handleOpenModal(customer)} className="bg-slate-600 text-slate-200 px-3 py-1 rounded-md text-xs font-semibold hover:bg-slate-500">Sửa</button>
                          <button onClick={() => handleDeleteCustomer(customer.id!)} className="bg-red-800/50 text-red-300 px-3 py-1 rounded-md text-xs font-semibold hover:bg-red-700/50">Xóa</button>
                      </div>
                  </div>
                  {customer.address && <p className="text-sm text-slate-400 mt-2"><strong>Địa chỉ:</strong> {customer.address}</p>}
                  {customer.notes && <p className="text-sm text-slate-400 mt-2 whitespace-pre-wrap border-l-2 border-slate-600 pl-3"><strong>Ghi chú:</strong> {customer.notes}</p>}

                  {images.length > 0 && (
                    <div className="mt-4">
                        <h5 className="text-sm font-semibold text-slate-400 mb-2">Hình ảnh đã lưu:</h5>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                           {images.map(image => (
                            <div key={image.id} className="group relative bg-slate-800 rounded-md overflow-hidden aspect-square">
                                <img src={image.thumbnailDataUrl} alt={`Saved work ${image.id}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button onClick={() => handleDownload(image, customer)} title="Tải ảnh này về (chất lượng cao)" className="bg-slate-600/80 hover:bg-cyan-500 text-white rounded-full p-2 transition-colors">
                                      <DownloadIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleUseImage(image)} title="Dùng ảnh này để chỉnh sửa tiếp (chất lượng cao)" className="bg-slate-600/80 hover:bg-green-500 text-white rounded-full p-2 transition-colors">
                                        <SendIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                           ))}
                        </div>
                    </div>
                  )}
                </div>
              )})}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CustomerHistoryPage;