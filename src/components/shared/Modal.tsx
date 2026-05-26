import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeClasses = {
  sm:   'max-w-sm w-full',
  md:   'max-w-lg w-full',
  lg:   'max-w-2xl w-full',
  xl:   'max-w-4xl w-full',
  full: 'max-w-6xl w-full',
};

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', handler);
    firstFocusRef.current?.focus();
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          <motion.div
            className={`relative ${sizeClasses[size]} bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
          >
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                <button
                  ref={firstFocusRef}
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close modal"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="overflow-y-auto flex-1">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
