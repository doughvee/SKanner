import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import supabase from "../supabase";
import "bootstrap/dist/css/bootstrap.min.css";
import "./CameraCapture.css";
import Tesseract from "tesseract.js";
import CropModal from "../components/CropModal"; // ✅ adjust path if needed

interface CameraCaptureProps {
  onCapture: (imageUrl: string, text: string) => void;
  username: string;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, username }) => {
  const location = useLocation();
  const budgetName = location.state?.budgetName || "Unknown Budget";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCropUrl, setImageToCropUrl] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [isFrontCamera]);

  const startCamera = async () => {
    try {
      stopCamera();
      const constraints = {
        video: { facingMode: isFrontCamera ? "user" : "environment" },
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        setStream(newStream);
      }
    } catch (error) {
      setCameraError("Failed to access the camera. Please allow permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const preview = URL.createObjectURL(blob);
        setImageToCropUrl(preview);
        setShowCropper(true);
      }
    }, "image/png");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setImageToCropUrl(preview);
      setShowCropper(true);
    }
  };

  const handleToggleFlash = async () => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities() as any;
    if ("torch" in capabilities) {
      try {
        await videoTrack.applyConstraints({ advanced: [{ torch: !flashOn }] } as any);
        setFlashOn(!flashOn);
      } catch (error) {
        console.error("Flash toggle error:", error);
      }
    }
  };

  const onCropComplete = async (croppedBlob: Blob) => {
    setCapturedImage(croppedBlob);
    setPreviewUrl(URL.createObjectURL(croppedBlob));
    setShowCropper(false);
    processImage(croppedBlob);
  };

  const processImage = async (image: Blob) => {
    setUploading(true);
    setOcrText(null);
    setError(null);
    try {
      const cleanedText = await extractReceiptText(image);
      setOcrText(cleanedText || "No text found.");

      const fileName = `receipt-${Date.now()}.png`;
      const { error } = await supabase.storage.from("receipts").upload(fileName, image);
      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from("receipts").getPublicUrl(fileName);
      const imageUrl = publicUrlData.publicUrl;

      onCapture(imageUrl, cleanedText);
    } catch (err) {
      setError("Error processing the receipt image.");
    } finally {
      setUploading(false);
    }
  };

  const extractReceiptText = async (image: Blob) => {
    try {
      const { data } = await Tesseract.recognize(URL.createObjectURL(image), "eng", {
        logger: (m) => console.log(m),
      });

      let rawText = data.text.trim();
      console.log("OCR Raw Text (Before Cleanup):", rawText);

      rawText = rawText
        .replace(/[^a-zA-Z0-9\s.,:\/\-]/g, "")
        .replace(/\s{2,}/g, " ")
        .replace(/\n{2,}/g, "\n")
        .trim();

      console.log("OCR Cleaned Text:", rawText);
      return rawText;
    } catch (error) {
      console.error("OCR Error:", error);
      return "";
    }
  };

  return (
    <div className="camera-container">
      <h2 className="scan-text text-center">Scan Receipt (Budget: {budgetName})</h2>
      <div className="camera-frame">
        {cameraError ? (
          <p className="text-danger">{cameraError}</p>
        ) : previewUrl ? (
          <img src={previewUrl} alt="Captured" className="captured-image-preview" />
        ) : (
          <video ref={videoRef} autoPlay className="camera-feed" />
        )}
        <canvas ref={canvasRef} className="hidden-canvas" />
      </div>

      <div className="controls">
  {!previewUrl ? (
    <>
      <button className="icon-button upload-photo" onClick={() => fileInputRef.current?.click()}>
        <i className="bi bi-file-earmark-image"></i>
      </button>
      <button className="icon-button capture" onClick={handleCapture}>
        <i className="bi bi-camera"></i>
      </button>
      <button className="icon-button" onClick={() => setIsFrontCamera(!isFrontCamera)}>
        <i className="bi bi-arrow-repeat"></i>
      </button>
      <button
        className={`icon-button ${isFrontCamera ? "disabled" : ""}`}
        onClick={handleToggleFlash}
      >
        <i className={`bi ${flashOn ? "bi-lightning-fill" : "bi-lightning"}`}></i>
      </button>
    </>
  ) : (
    <button
      className="icon-button upload"
      onClick={() => capturedImage && processImage(capturedImage)}
      disabled={uploading}
    >
      <i className={uploading ? "bi bi-cloud-upload-fill text-primary" : "bi bi-cloud-upload"}></i>
    </button>
  )}
</div>

      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} style={{ display: "none" }} />

      {/* ✅ Show Crop Modal */}
      {showCropper && imageToCropUrl && (
        <CropModal
          image={imageToCropUrl}
          onCropComplete={onCropComplete}
          onCancel={() => setShowCropper(false)}
        />
      )}
    </div>
  );
};

export default CameraCapture;
