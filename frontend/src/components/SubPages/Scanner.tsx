import "../../styles/global.css";
import "../../styles/Scanner.css";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { uploadDocument } from "../../services/api";

interface ScannerProps {
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // запуск камеры
  const startCamera = useCallback(async () => {
    setError("");
    setIsCameraReady(false);
    
    // останавливает предыдущий поток
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      console.log("Запрашиваем доступ к камере...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" }
      });
      
      console.log("Доступ к камере получен");
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          console.log("Видео готово");
          setIsCameraReady(true);
        };
      }
    } catch (err) {
      console.error("Ошибка доступа к камере:", err);
      if ((err as Error).name === "NotAllowedError") {
        setError("Доступ к камере запрещён. Разрешите доступ в настройках браузера.");
      } else if ((err as Error).name === "NotFoundError") {
        setError("Камера не найдена.");
      } else {
        setError("Не удалось получить доступ к камере.");
      }
    }
  }, [stream]);

  const capturePhoto = async () => {
    console.log("capturePhoto вызван");
    console.log("videoRef.current:", videoRef.current);
    console.log("canvasRef.current:", canvasRef.current);
    console.log("isCameraReady:", isCameraReady);
    
    if (!videoRef.current || !canvasRef.current) {
      console.error("video или canvas не найден");
      setError("Ошибка: не удалось получить видео");
      return;
    }
    
    if (!isCameraReady) {
      console.error("Камера не готова");
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
      console.log("Размеры canvas:", canvas.width, canvas.height);
      
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error("Некорректный размер видео");
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Не удалось получить контекст canvas");
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      console.log("Кадр отрисован");
      
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.9);
      });
      
      if (!blob) throw new Error("Не удалось создать изображение");
      console.log("Blob создан, размер:", blob.size, "bytes");
      
      // создаем файл
      const fileName = `scan_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: "image/jpeg" });
      console.log("File создан:", file.name, file.size, "bytes");
      

      console.log("Отправка на сервер...");
      const response = await uploadDocument(file);
      console.log("Ответ сервера:", response);
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
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
      console.error("Ошибка при сканировании:", err);
      setError(err instanceof Error ? err.message : "Не удалось отправить скан");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="scanner-overlay" onClick={onClose}>
      <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-header">
          <h2 className="scanner-title">Сканирование документа</h2>
          <button className="scanner-close-btn" onClick={onClose}>
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