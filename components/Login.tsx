

import React, { useState } from 'react';
import { createLocalUser, authenticateLocalUser } from '../services/dbService';
import type { LocalUser } from '../services/dbService';


interface LoginProps {
  onLogin: (user: LocalUser) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        if (isLoginMode) {
            // Handle Login
            const user = await authenticateLocalUser(username, password);
            if (user) {
                onLogin(user);
            } else {
                setError('Tên người dùng hoặc mật khẩu không đúng.');
            }
        } else {
            // Handle Registration
            if (username.length < 3 || password.length < 4) {
                setError('Tên người dùng cần ít nhất 3 ký tự, mật khẩu cần ít nhất 4 ký tự.');
                return;
            }
            const newUser = await createLocalUser(username, password);
            onLogin(newUser);
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.';
        setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  };

  const toggleMode = () => {
      setIsLoginMode(!isLoginMode);
      setError('');
      setUsername('');
      setPassword('');
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1E293B] p-8 rounded-xl shadow-lg w-full max-w-sm border border-slate-700">
        <h2 className="text-2xl font-bold text-center text-cyan-400 mb-2">
          KHOI PHUC ANH CU
        </h2>
        <p className="text-center text-slate-400 mb-6">
            {isLoginMode ? 'Đăng nhập vào tài khoản của bạn' : 'Tạo tài khoản mới'}
        </p>
         <div className="text-center text-xs text-amber-300 bg-amber-900/50 border border-amber-700 p-2 rounded-md mb-4">
            <strong>Lưu ý:</strong> Tài khoản này chỉ được lưu trên trình duyệt này. Xóa dữ liệu trình duyệt sẽ làm mất tài khoản.
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-400 mb-1" htmlFor="username">
              Tên đăng nhập
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
              required
              autoFocus
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-400 mb-1" htmlFor="password">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
              required
            />
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
            ) : (isLoginMode ? 'Đăng nhập' : 'Tạo tài khoản')}
          </button>
        </form>
         <p className="text-center text-sm text-slate-400 mt-6">
            {isLoginMode ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
            <button onClick={toggleMode} className="font-semibold text-cyan-400 hover:text-cyan-300 ml-2">
                {isLoginMode ? 'Tạo tài khoản' : 'Đăng nhập'}
            </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
