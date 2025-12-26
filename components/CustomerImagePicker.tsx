import React, { useState, useEffect, useCallback, useMemo } from 'react';
// FIX: Import LocalUser type to use for the currentUser prop
import { CustomerRecord, ArchivedImage, getAllCustomers, getImagesForCustomer, LocalUser } from '../services/dbService';
import { CloseIcon } from './icons/CloseIcon';

interface CustomerImagePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelect: (image: ArchivedImage) => void;
  currentUser: LocalUser;
}

const CustomerImagePicker: React.FC<CustomerImagePickerProps> = ({ isOpen, onClose, onImageSelect, currentUser }) => {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [customerImages, setCustomerImages] = useState<Record<number, ArchivedImage[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!currentUser.id) return;
    setLoading(true);
    setError(null);
    try {
      // FIX: Pass userId to getAllCustomers
      const customerData = await getAllCustomers(currentUser.id);
      setCustomers(customerData);

      const imagesByCustomer: Record<number, ArchivedImage[]> = {};
      for (const customer of customerData) {
        if (customer.id) {
          // FIX: Pass userId to getImagesForCustomer
          const images = await getImagesForCustomer(customer.id, currentUser.id);
          imagesByCustomer[customer.id] = images;
        }
      }
      setCustomerImages(imagesByCustomer);
    } catch (err) {
      console.error("Failed to load customer data:", err);
      setError("Không thể tải dữ liệu khách hàng.");
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    if (isOpen) {
      fetchAllData();
    }
  }, [isOpen, fetchAllData]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    const lowercasedQuery = searchQuery.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(lowercasedQuery) ||
      c.phone.includes(lowercasedQuery)
    );
  }, [customers, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1E293B] rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] border border-slate-700 flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-cyan-400">Chọn ảnh từ khách hàng</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><CloseIcon className="w-6 h-6" /></button>
        </header>
        <div className="p-4">
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc SĐT..."
            className="w-full bg-slate-700 border border-slate-600 rounded-md px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div className="flex-grow overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex justify-center items-center h-full"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : error ? (
            <div className="text-center text-red-400 p-4">{error}</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center text-slate-500 p-8">Không tìm thấy khách hàng.</div>
          ) : (
            <div className="divide-y divide-slate-700">
              {filteredCustomers.map(customer => {
                const images = customerImages[customer.id!] || [];
                const isExpanded = expandedCustomerId === customer.id;
                return (
                  <div key={customer.id} className="py-2">
                    <button onClick={() => setExpandedCustomerId(isExpanded ? null : customer.id!)} className="w-full text-left p-2 rounded-md hover:bg-slate-700 flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-slate-200">{customer.name}</h4>
                        <p className="text-sm text-cyan-400 font-mono">{customer.phone}</p>
                      </div>
                      <span className="text-sm text-slate-400">{images.length} ảnh</span>
                    </button>
                    {isExpanded && (
                      <div className="p-2 mt-2 bg-slate-800/50 rounded-md">
                        {images.length > 0 ? (
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                            {images.map(image => (
                              <button key={image.id} onClick={() => onImageSelect(image)} className="group relative bg-slate-800 rounded-md overflow-hidden aspect-square focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                <img src={image.thumbnailDataUrl} alt={`Saved work ${image.id}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                  Chọn
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 text-center py-4">Khách hàng này chưa có ảnh nào được lưu.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerImagePicker;
