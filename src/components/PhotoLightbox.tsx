import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence } from "framer-motion";
import { m3DurationSeconds, M3_MOTION_EASE } from "@/lib/m3Motion";

export interface LightboxImage {
  url: string;
  label?: string;
  date?: string;
}

interface Props {
  images: LightboxImage[];
  initialIndex: number;
  onClose: () => void;
}

export function PhotoLightbox({ images, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const image = images[index];

  const goPrev = useCallback(() => {
    setIndex(i => (i > 0 ? i - 1 : images.length - 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setIndex(i => (i < images.length - 1 ? i + 1 : 0));
  }, [images.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose, goPrev, goNext]);

  if (!image) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: m3DurationSeconds("standardAccelerate"),
          ease: [...M3_MOTION_EASE.standardAccelerate] as [number, number, number, number],
        }}
        className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center"
        onClick={onClose}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
        </button>

        <motion.img
          key={index}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: m3DurationSeconds("standardAccelerate"),
            ease: [...M3_MOTION_EASE.standardDecelerate] as [number, number, number, number],
          }}
          src={image.url}
          alt={image.label || `Photo ${index + 1}`}
          className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
          onClick={e => e.stopPropagation()}
        />

        {images.length > 1 && (
          <>
            <button
              onClick={e => { e.stopPropagation(); goPrev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="h-5 w-5" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); goNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <FontAwesomeIcon icon={faChevronRight} className="h-5 w-5" />
            </button>
          </>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between text-white text-sm max-w-2xl mx-auto">
            <span>{image.label || ''}</span>
            <span className="text-white/70 tabular-nums">{index + 1} / {images.length}</span>
          </div>
          {image.date && (
            <p className="text-white/50 text-xs text-center mt-1">{image.date}</p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
