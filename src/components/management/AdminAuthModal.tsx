import React, { useState, useEffect } from 'react';
import { useAtelier } from '../../store/AtelierContext';
import { Lock, User, KeyRound, AlertCircle, X, ShieldCheck, Eye, EyeOff, CheckSquare } from 'lucide-react';
import { toEnglishDigits } from '../../utils/dateUtils';
import { API_BASE, getJson } from '../../api/paymentApi';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { loginManagement } = useAtelier();
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem('royal_admin_username') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated and remembered in browser, auto-proceed without asking again
  useEffect(() => {
    if (!isOpen) return;
    try {
      const isRemembered =
        localStorage.getItem('royal_mgmt_authenticated') === 'true' ||
        sessionStorage.getItem('royal_mgmt_authenticated') === 'true';
      const savedToken =
        localStorage.getItem('admin_token') ||
        localStorage.getItem('royal_admin_token');

      if (isRemembered && savedToken) {
        if (loginManagement) {
          loginManagement(localStorage.getItem('royal_admin_username') || '', savedToken);
        }
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch {}
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const cleanP = toEnglishDigits(password).trim();
    if (!cleanP) {
      setErrorMessage('رمز عبور الزامی است');
      setIsSubmitting(false);
      return;
    }

    try {
      if (loginManagement) {
        const result = await loginManagement(username, cleanP);
        if (result && result.success) {
          if (rememberMe) {
            localStorage.setItem('admin_token', cleanP);
            localStorage.setItem('royal_admin_token', cleanP);
            if (username) {
              localStorage.setItem('royal_admin_username', username);
            }
            localStorage.setItem('royal_mgmt_authenticated', 'true');
            localStorage.setItem('royal_mgmt_remember_me', 'true');
            localStorage.setItem('royal_portal_mode', 'management');
            sessionStorage.setItem('royal_mgmt_authenticated', 'true');
          }
          setPassword('');
          setErrorMessage(null);
          if (onSuccess) onSuccess();
          onClose();
          return;
        } else {
          setErrorMessage(result?.error || 'نام کاربری یا رمز عبور اشتباه است');
          return;
        }
      }

      // Fallback direct verification
      const res = await fetch(`${API_BASE}/bookings.php`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Admin-Token': cleanP,
        },
      });

      if (res.status === 401 || !res.ok) {
        setErrorMessage('رمز اشتباه است');
        return;
      }

      const data = await res.json().catch(() => null);

      if (data && data.ok === true) {
        if (rememberMe) {
          localStorage.setItem('admin_token', cleanP);
          localStorage.setItem('royal_admin_token', cleanP);
          if (username) {
            localStorage.setItem('royal_admin_username', username);
          }
          localStorage.setItem('royal_mgmt_authenticated', 'true');
          localStorage.setItem('royal_mgmt_remember_me', 'true');
          localStorage.setItem('royal_portal_mode', 'management');
          sessionStorage.setItem('royal_mgmt_authenticated', 'true');
        }
        setPassword('');
        setErrorMessage(null);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage('رمز اشتباه است');
      }
    } catch {
      setErrorMessage('خطا در برقراری ارتباط با سرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="admin-auth-modal-backdrop"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      dir="rtl"
    >
      <div
        id="admin-auth-modal-card"
        className="relative w-full max-w-[360px] bg-white/95 backdrop-blur-2xl border border-white/90 rounded-[32px] p-6 shadow-2xl text-stone-900 overflow-hidden"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:text-stone-900 hover:bg-stone-200 flex items-center justify-center transition-colors cursor-pointer"
          title="بستن"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Badge & Title */}
        <div className="text-center pt-2 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-stone-900/10 border border-stone-900/20 text-stone-800 mx-auto flex items-center justify-center mb-3 shadow-inner">
            <KeyRound className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-stone-800 bg-stone-100 border border-stone-300 px-2.5 py-0.5 rounded-full inline-block mb-1.5">
            بخش مدیریت و پذیرش آرایشگاه
          </span>
          <h2 className="text-base font-bold text-stone-900 tracking-tight">
            ورود به پنل مدیریت
          </h2>
          <p className="text-[11px] text-stone-600 mt-1 leading-relaxed px-2">
            جهت دسترسی به داشبورد نوبت‌ها، لیست مراجعین و تنظیمات، نام کاربری و رمز عبور را وارد کنید.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Username Input */}
          <div>
            <label className="block text-[11px] font-medium text-stone-700 mb-1">
              نام کاربری
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-stone-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="admin-username-input"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(toEnglishDigits(e.target.value))}
                placeholder="نام کاربری مدیریت"
                className="w-full pl-3 pr-9 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-800 focus:ring-1 focus:ring-stone-800 transition-all font-sans"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-[11px] font-medium text-stone-700 mb-1">
              رمز عبور
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-stone-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(toEnglishDigits(e.target.value))}
                placeholder="رمز عبور مدیریت"
                className="w-full pl-9 pr-9 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-800 focus:ring-1 focus:ring-stone-800 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                title={showPassword ? 'مخفی کردن رمز' : 'نمایش رمز'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between px-0.5 pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-stone-700 hover:text-stone-900">
              <input
                id="admin-remember-me-checkbox"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-800 accent-stone-900 cursor-pointer"
              />
              <span>مرا به خاطر بسپار (عدم درخواست مجدد رمز)</span>
            </label>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              id="admin-login-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-gradient-to-b from-white to-[#f1f5f9] hover:from-white hover:to-[#e2e8f0] active:scale-[0.98] text-[#0f172a] rounded-xl text-xs font-black transition-all shadow-md border border-white ring-1 ring-white/80 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#0f172a]" />
              <span>{isSubmitting ? 'در حال بررسی...' : 'ورود به پنل مدیریت'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium transition-colors text-center cursor-pointer"
            >
              انصراف و بازگشت به نمای مشتری
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

