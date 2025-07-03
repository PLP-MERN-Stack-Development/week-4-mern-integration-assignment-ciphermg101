import { toast, type ToastT } from 'sonner';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const showToast = (
  type: ToastType,
  title: string,
  options: ToastOptions = {}
) => {
  const { description, duration = 5000, action } = options;

  const toastConfig = {
    duration,
    ...(action && { action: { label: action.label, onClick: action.onClick } }),
  };

  switch (type) {
    case 'success':
      return toast.success(title, { ...toastConfig, description });
    case 'error':
      return toast.error(title, { ...toastConfig, description });
    case 'warning':
      return toast.warning(title, { ...toastConfig, description });
    case 'info':
    default:
      return toast(title, { ...toastConfig, description } as ToastT);
  }
};

// Convenience methods
export const showSuccess = (title: string, options?: Omit<ToastOptions, 'type'>) =>
  showToast('success', title, options);

export const showError = (title: string, options?: Omit<ToastOptions, 'type'>) =>
  showToast('error', title, options);

export const showWarning = (title: string, options?: Omit<ToastOptions, 'type'>) =>
  showToast('warning', title, options);

export const showInfo = (title: string, options?: Omit<ToastOptions, 'type'>) =>
  showToast('info', title, options);
