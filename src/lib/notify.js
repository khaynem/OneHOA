import toast from 'react-hot-toast'
import ToastMessage from '@/components/toast/toast-message'

const normalizePayload = (input, fallbackTitle) => {
  if (typeof input === 'string') {
    return {
      title: fallbackTitle,
      description: input,
    }
  }

  if (input && typeof input === 'object') {
    return {
      title: input.title || fallbackTitle,
      description: input.description || '',
    }
  }

  return {
    title: fallbackTitle,
    description: '',
  }
}

const showToast = (variant, input, options = {}) => {
  const defaults = {
    success: { title: 'Success toast message', duration: 3000 },
    info: { title: 'Info toast message', duration: 3600 },
    error: { title: 'Error toast message', duration: 4200 },
  }

  const config = defaults[variant] || defaults.info
  const content = normalizePayload(input, config.title)

  return toast.custom(
    (toastState) => (
      <ToastMessage
        variant={variant}
        title={content.title}
        description={content.description}
        visible={toastState.visible}
      />
    ),
    {
      duration: options.duration || config.duration,
      removeDelay: 220,
      ...options,
    }
  )
}

export const notify = {
  success: (message, options) => showToast('success', message, options),
  error: (message, options) => showToast('error', message, options),
  info: (message, options) => showToast('info', message, options),
  loading: (message, options) => toast.loading(message, options),
  promise: (promise, messages, options) => toast.promise(promise, messages, options),
  dismiss: (toastId) => toast.dismiss(toastId),
}
