import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Zap, Check, AlertTriangle, Image as ImageIcon } from 'lucide-react';

interface InAppCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureImage: (dataUrl: string) => void;
  onOpenFallbackFilePicker?: () => void;
}

export const InAppCameraModal: React.FC<InAppCameraModalProps> = ({
  isOpen,
  onClose,
  onCaptureImage,
  onOpenFallbackFilePicker,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState<boolean>(true);
  const [flashAnimation, setFlashAnimation] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Start / restart camera stream when modal opens or facing mode changes
  useEffect(() => {
    if (!isOpen) {
      stopCurrentStream();
      return;
    }

    let isMounted = true;
    setIsLoadingCamera(true);
    setCameraError(null);

    async function startCamera() {
      stopCurrentStream();

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('La cámara directa en vivo no está disponible en este navegador. Usa el botón de Galería/Archivo.');
        }

        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
          },
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!isMounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        setStream(mediaStream);
        setIsLoadingCamera(false);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch((e) => console.warn('Video play prevented:', e));
        }

        // Check if torch/flashlight is supported
        const videoTrack = mediaStream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;
          if (capabilities.torch) {
            setHasTorch(true);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Camera access error:', err);
        setIsLoadingCamera(false);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError('Permiso de cámara denegado. Habilita el acceso a la cámara en los ajustes del navegador.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraError('No se encontró ninguna cámara en este dispositivo.');
        } else {
          setCameraError(err.message || 'No se pudo iniciar la cámara en vivo.');
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      stopCurrentStream();
    };
  }, [isOpen, facingMode]);

  const stopCurrentStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleToggleTorch = async () => {
    if (!stream || !hasTorch) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const nextTorch = !torchOn;
      await (videoTrack as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleCapture = () => {
    if (!videoRef.current) return;

    // Trigger visual flash
    setFlashAnimation(true);
    setTimeout(() => setFlashAnimation(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    // Max dimension 1024 for minimal memory footprint and fast AI upload
    const maxDim = 1024;
    let width = video.videoWidth || 1280;
    let height = video.videoHeight || 720;

    if (width > height) {
      if (width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      }
    } else {
      if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, width, height);

    // Get compressed lightweight JPEG data URL (~120KB)
    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

    onCaptureImage(compressedDataUrl);
    stopCurrentStream();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Top bar controls */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-slate-950/80 to-transparent">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 rounded-full border border-slate-700">
            <Camera className="w-3.5 h-3.5 text-teal-400" />
            Cámara en Vivo
          </span>

          <div className="flex items-center gap-2">
            {hasTorch && (
              <button
                type="button"
                onClick={handleToggleTorch}
                className={`p-2.5 rounded-full transition border ${
                  torchOn
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:text-white'
                }`}
                title="Linterna / Flash"
              >
                <Zap className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleSwitchCamera}
              className="p-2.5 bg-slate-900/80 text-slate-300 hover:text-white border border-slate-700 rounded-full transition"
              title="Cambiar Cámara"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                stopCurrentStream();
                onClose();
              }}
              className="p-2.5 bg-slate-900/80 text-slate-300 hover:text-rose-400 border border-slate-700 rounded-full transition"
              title="Cerrar Cámara"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Viewport */}
        <div className="relative w-full bg-black aspect-[3/4] sm:aspect-[4/3] flex items-center justify-center overflow-hidden">
          {isLoadingCamera && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-teal-400" />
              <span className="text-xs font-medium">Iniciando cámara en vivo...</span>
            </div>
          )}

          {cameraError ? (
            <div className="p-6 text-center space-y-4 max-w-xs">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <p className="text-xs text-rose-200">{cameraError}</p>
              {onOpenFallbackFilePicker && (
                <button
                  type="button"
                  onClick={() => {
                    stopCurrentStream();
                    onClose();
                    onOpenFallbackFilePicker();
                  }}
                  className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  Elegir de Galería o Archivos
                </button>
              )}
            </div>
          ) : (
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover"
            />
          )}

          {/* Flash animation overlay */}
          {flashAnimation && (
            <div className="absolute inset-0 bg-white opacity-80 pointer-events-none transition-opacity duration-200" />
          )}

          {/* Targeting guideline box */}
          {!cameraError && !isLoadingCamera && (
            <div className="absolute inset-8 border border-white/30 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
              <div className="flex justify-between">
                <div className="w-4 h-4 border-t-2 border-l-2 border-teal-400" />
                <div className="w-4 h-4 border-t-2 border-r-2 border-teal-400" />
              </div>
              <p className="text-[11px] text-white/70 text-center bg-black/40 py-1 px-3 rounded-full backdrop-blur-sm mx-auto">
                Enfoca el plato o la etiqueta nutricional
              </p>
              <div className="flex justify-between">
                <div className="w-4 h-4 border-b-2 border-l-2 border-teal-400" />
                <div className="w-4 h-4 border-b-2 border-r-2 border-teal-400" />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Shutter Bar */}
        <div className="p-4 bg-slate-950 flex items-center justify-around border-t border-slate-800">
          {onOpenFallbackFilePicker ? (
            <button
              type="button"
              onClick={() => {
                stopCurrentStream();
                onClose();
                onOpenFallbackFilePicker();
              }}
              className="p-3 text-slate-400 hover:text-slate-200 text-xs flex flex-col items-center gap-1 transition"
              title="Abrir Galería"
            >
              <ImageIcon className="w-5 h-5" />
              <span className="text-[10px]">Galería</span>
            </button>
          ) : (
            <div className="w-12" />
          )}

          {/* Shutter Button */}
          <button
            type="button"
            onClick={handleCapture}
            disabled={isLoadingCamera || !!cameraError}
            className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center p-1 bg-white/10 active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-teal-500/20 cursor-pointer"
            title="Capturar Foto"
          >
            <div className="w-full h-full bg-teal-400 rounded-full hover:bg-teal-300 transition" />
          </button>

          <button
            type="button"
            onClick={handleSwitchCamera}
            disabled={isLoadingCamera || !!cameraError}
            className="p-3 text-slate-400 hover:text-slate-200 text-xs flex flex-col items-center gap-1 transition"
            title="Girar Cámara"
          >
            <RefreshCw className="w-5 h-5" />
            <span className="text-[10px]">Girar</span>
          </button>
        </div>

      </div>
    </div>
  );
};
