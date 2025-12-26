import React, { useState, useEffect } from 'react';
import { generateMachineFingerprint } from '../utils/fingerprint';
import { saveActivationData, getActivationAttempts, incrementActivationAttempts, MAX_ATTEMPTS } from '../utils/secureStore';
import { FacebookIcon } from './icons/FacebookIcon';
import { ZaloIcon } from './icons/ZaloIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';
import { DesktopComputerIcon } from './icons/DesktopComputerIcon';

interface ActivationProps {
  onActivate: () => void;
}

// IMPORTANT: This secret salt MUST be IDENTICAL to the one in keygen.html.
const SECRET_SALT = "PHUC_HOI_ANH_CU_SECRET_SAUCE_v1.0";

// Obfuscated admin credentials using Base64 to prevent simple string search in source code.
const ADMIN_ID_B64 = 'ZGluaHZhbnNhbw=='; 
const ADMIN_KEY_B64 = 'MTExMjIyMzMzNDQ0'; 
const generateKey = async (machineId: string): Promise<string | null> => {
    if (!machineId) return null;
    const combined = `${machineId.trim().toUpperCase()}|${SECRET_SALT}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const part1 = hashHex.substring(0, 4).toUpperCase();
    const part2 = hashHex.substring(4, 8).toUpperCase();
    const part3 = hashHex.substring(8, 12).toUpperCase();
    const part4 = hashHex.substring(12, 16).toUpperCase();
    
    return `${part1}-${part2}-${part3}-${part4}`;
};

const Activation: React.FC<ActivationProps> = ({ onActivate }) => {
  const [machineId, setMachineId] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isFetchingId, setIsFetchingId] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');
  
  // New state for attempt locking
  const [isAttemptLocked, setIsAttemptLocked] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const attemptsCount = getActivationAttempts();
    setAttempts(attemptsCount);
    if (attemptsCount >= MAX_ATTEMPTS) {
        setIsAttemptLocked(true);
    }
  }, []);

  const handleFetchMachineId = async () => {
    setIsFetchingId(true);
    setError('');
    setCopyFeedback('');
    try {
        const id = await generateMachineFingerprint();
        setMachineId(id);
        await navigator.clipboard.writeText(id);
        setCopyFeedback('Đã sao chép vào bộ nhớ tạm!');
        setTimeout(() => setCopyFeedback(''), 3000);
    } catch (e) {
        setError('Không thể lấy mã máy tự động.');
    } finally {
        setIsFetchingId(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isAttemptLocked) {
        setError('Bạn đã nhập sai quá nhiều lần. Vui lòng liên hệ admin.');
        return;
    }

    setIsLoading(true);

    const submittedId = machineId.trim().toLowerCase();
    const submittedKey = licenseKey.trim();

    try {
        // Admin credentials still bypass attempt lock, which is good.
        if (btoa(submittedId) === ADMIN_ID_B64 && btoa(submittedKey) === ADMIN_KEY_B64) {
            saveActivationData(submittedId.toUpperCase(), submittedKey, null, true);
            onActivate();
            return;
        }

        const expectedKey = await generateKey(machineId);
        const formattedUserInputKey = submittedKey.toUpperCase();

        if (expectedKey && expectedKey === formattedUserInputKey) {
            const fingerprint = await generateMachineFingerprint();
            saveActivationData(machineId.trim().toUpperCase(), formattedUserInputKey, fingerprint, false);
            onActivate();
        } else {
            const newAttempts = incrementActivationAttempts();
            setAttempts(newAttempts);
            if (newAttempts >= MAX_ATTEMPTS) {
                setError('Bạn đã nhập sai quá 3 lần. Tài khoản đã bị khoá.');
                setIsAttemptLocked(true);
            } else {
                setError(`Mã không hợp lệ. Bạn còn ${MAX_ATTEMPTS - newAttempts} lần thử.`);
            }
        }
    } catch (err) {
        console.error("Activation error:", err);
        setError('Đã xảy ra lỗi trong quá trình kích hoạt.');
    } finally {
        setIsLoading(false);
    }
  };

  if (isAttemptLocked) {
    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-gradient-to-b from-[#10172A] to-[#075985]">
            <div className="bg-[#1E293B] p-8 rounded-xl shadow-lg w-full max-w-sm border border-red-700 text-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                 </svg>
                <h2 className="text-2xl font-bold text-center text-red-400 mt-4">
                  Tài khoản bị tạm khóa
                </h2>
                <p className="text-center text-slate-300 mt-4">
                  Bạn đã nhập sai thông tin kích hoạt quá 3 lần. Để bảo mật, chức năng kích hoạt đã bị khóa.
                </p>
                <div className="mt-6 text-center text-sm text-slate-400 border-t border-slate-700 pt-4">
                    <p className="mb-3">Vui lòng liên hệ admin để được hỗ trợ:</p>
                    <div className="flex items-center justify-center gap-6">
                        <div className="flex items-center gap-2">
                          <ZaloIcon className="w-6 h-6" />
                          <span className="font-semibold text-slate-200 text-base">0915213717</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1E293B] p-8 rounded-xl shadow-lg w-full max-w-sm border border-slate-700">
        <h2 className="text-2xl font-bold text-center text-cyan-400 mb-2">
          Kích hoạt Phần mềm
        </h2>
        <p className="text-center text-slate-400 mb-6">
          Vui lòng nhập thông tin được cấp để sử dụng.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-400 mb-1" htmlFor="machineId">
              Mã định danh
            </label>
            <div className="relative flex items-center">
              <input
                id="machineId"
                type="text"
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors pr-10"
                required
                autoFocus
                placeholder="Nhấn nút bên phải để lấy mã"
              />
              <button
                type="button"
                onClick={handleFetchMachineId}
                disabled={isFetchingId}
                className="absolute inset-y-0 right-0 flex items-center px-2 text-slate-400 hover:text-cyan-400 disabled:cursor-wait disabled:text-slate-600"
                title="Lấy mã từ máy này"
              >
                {isFetchingId ? (
                   <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                ) : (
                  <DesktopComputerIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            {copyFeedback && <p className="text-green-400 text-xs mt-1 animate-fadeIn">{copyFeedback}</p>}
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-400 mb-1" htmlFor="licenseKey">
              Mã kích hoạt
            </label>
            <div className="relative">
              <input
                id="licenseKey"
                type={isKeyVisible ? 'text' : 'password'}
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors pr-10"
                required
                placeholder="XXXX-XXXX-XXXX-XXXX"
              />
              <button
                type="button"
                onClick={() => setIsKeyVisible(!isKeyVisible)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white"
                aria-label={isKeyVisible ? "Ẩn mã" : "Hiện mã"}
              >
                {isKeyVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-cyan-500 text-white px-4 py-2 rounded-md text-base font-semibold hover:bg-cyan-600 transition-colors flex items-center justify-center disabled:bg-cyan-800 disabled:cursor-not-allowed"
          >
            {isLoading ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : 'Kích hoạt'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400 border-t border-slate-700 pt-4">
          <p className="mb-3">Liên hệ admin để được cấp phép:</p>
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <ZaloIcon className="w-6 h-6" />
              <span className="font-semibold text-slate-200 text-base">0915213717</span>
            </div>
          </div>
        </div>
      </div>
       <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default Activation;