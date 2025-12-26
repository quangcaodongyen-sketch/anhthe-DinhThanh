import React, { useState, useEffect, useRef } from 'react';
import { CustomerRecord } from '../services/dbService';
import { CloseIcon } from './icons/CloseIcon';
import { UploadIcon } from './icons/UploadIcon';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // FIX: Correct the onSave prop type to omit userId for new customers, aligning with parent component logic.
  onSave: (customer: Omit<CustomerRecord, 'id' | 'createdAt' | 'updatedAt' | 'userId'> | CustomerRecord, imageFile?: File | null) => void;
  customer?: CustomerRecord | null;
  initialNotes?: string;
  showUploader?: boolean;
}

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ isOpen, onClose, onSave, customer, initialNotes, showUploader }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        if (customer) {
          setFormData({
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            notes: customer.notes
          });
        } else {
          setFormData({ name: '', phone: '', address: '', notes: initialNotes || '' });
        }
        setImageFile(null);
        setPreviewUrl(null);
    }
  }, [customer, isOpen, initialNotes]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customer) {
      onSave({ ...customer, ...formData }, imageFile);
    } else {
      onSave(formData, imageFile);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1E293B] rounded-xl shadow-2xl w-full max-w-lg border border-slate-700 flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-cyan-400">{customer ? 'Chỉnh sửa thông tin' : 'Thêm khách hàng mới'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><CloseIcon className="w-6 h-6" /></button>
        </header>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-400 mb-1">Tên khách hàng <span className="text-red-400">*</span></label>
                <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500" />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-400 mb-1">Số điện thoại <span className="text-red-400">*</span></label>
                <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} required className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500" />
              </div>
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-slate-400 mb-1">Địa chỉ</label>
              <input type="text" id="address" name="address" value={formData.address} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500" />
            </div>
             {showUploader && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Ảnh đại diện (tùy chọn)</label>
                <div 
                    onClick={() => imageInputRef.current?.click()}
                    className="mt-1 flex justify-center items-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md cursor-pointer hover:border-cyan-500 min-h-[10rem]"
                >
                    {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="max-h-32 rounded-md object-contain" />
                    ) : (
                        <div className="space-y-1 text-center">
                            <UploadIcon className="mx-auto h-10 w-10 text-slate-500" />
                            <p className="text-sm text-slate-400">Nhấn để tải ảnh lên</p>
                            <p className="text-xs text-slate-500">PNG, JPG, GIF</p>
                        </div>
                    )}
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </div>
            )}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-400 mb-1">Ghi chú / Yêu cầu</label>
              <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={4} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500" placeholder="Ví dụ: Phục hồi ảnh cưới, in 10 ảnh 4x6..."></textarea>
            </div>
          </div>
          <footer className="flex justify-end gap-3 p-4 bg-slate-800/50 border-t border-slate-700 rounded-b-xl">
            <button type="button" onClick={onClose} className="bg-slate-600 text-slate-200 px-4 py-2 rounded-md text-sm font-semibold hover:bg-slate-500">Hủy</button>
            <button type="submit" className="bg-cyan-500 text-white px-6 py-2 rounded-md text-sm font-bold hover:bg-cyan-600">Lưu</button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default CustomerFormModal;
