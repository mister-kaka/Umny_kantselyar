import "../styles/global.css";
import "../styles/Scanner.css";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { uploadDocument } from "../services/api";

interface ScannerProps {
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const stopCamera = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError("");
    setIsCameraReady(false);

    stopCamera();

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });

      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
        };
      }
    } catch (err) {
      if ((err as Error).name === "NotAllowedError") {
        setError("Доступ к камере запрещён. Разрешите доступ в настройках браузера.");
      } else if ((err as Error).name === "NotFoundError") {
        setError("Камера не найдена.");
      } else {
        setError("Не удалось получить доступ к камере.");
      }
    }
  }, [stopCamera]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError("Ошибка: не удалось получить видео");
      return;
    }

    if (!isCameraReady) {
      setError("Камера ещё не готова, подождите");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error("Некорректный размер видео");
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Не удалось получить контекст canvas");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.9);
      });

      if (!blob) throw new Error("Не удалось создать изображение");

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const fileName = `Scan_${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.jpg`;
      const file = new File([blob], fileName, { type: "image/jpeg" });

      const response = await uploadDocument(file);

      stopCamera();
      onClose();

      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = e.target?.result;
        localStorage.setItem("pending_scan", JSON.stringify({
          fileName: file.name,
          fileData: fileData,
          documentId: response.id
        }));
        navigate("/dashboard/incoming");
      };
      reader.readAsDataURL(file);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить скан");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  return (
    <div className="scanner-overlay" onClick={handleClose}>
      <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-header">
          <h2 className="scanner-title">Сканирование документа</h2>
          <button className="scanner-close-btn" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="scanner-body">
          {error && (
            <div className="scanner-error">
              ⚠️ {error}
            </div>
          )}

          <div className="scanner-video-wrapper">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="scanner-video"
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {!isCameraReady && !error && (
              <div className="scanner-loading">
                <div className="scanner-spinner" />
                <span>Запуск камеры...</span>
              </div>
            )}
          </div>

          <div className="scanner-actions">
            <button
              className="scanner-capture-btn"
              onClick={capturePhoto}
              disabled={loading || !isCameraReady}
            >
              {loading ? (
                <>
                  <div className="scanner-btn-spinner" />
                  Отправка...
                </>
              ) : (
                "Сделать снимок"
              )}
            </button>
          </div>

          <p className="scanner-hint">
            Наведите камеру на документ и нажмите «Сделать снимок»
          </p>
        </div>
      </div>
    </div>
  );
};

export default Scanner;