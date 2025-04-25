import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import supabase from "../supabase";
import "bootstrap/dist/css/bootstrap.min.css";
import "./CameraCapture.css";

// 🔹 Define Props Interface
interface CameraCaptureProps {
  onCapture: (imageUrl: string) => void;
  username: string; // Add username to props
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, username }) => {
  const location = useLocation();
  const budgetId = location.state?.budgetId || "No Budget Selected";
  const budgetName = location.state?.budgetName || "Unknown Budget";

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: isFrontCamera ? "user" : "environment" },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraError(null);
        } else {
          setCameraError("Camera element not found.");
        }
      } catch (error) {
        setCameraError("Failed to access the camera. Please allow permissions.");
        console.error("🚨 Camera access error:", error);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isFrontCamera]);

  const handleSwitchCamera = () => {
    setIsFrontCamera((prev) => !prev);
  };

  const uploadToSupabase = async (imageBlob: Blob) => {
    setUploading(true);
    const fileName = `receipt-${Date.now()}.png`;

    try {
      const { data, error } = await supabase.storage
        .from("receipts")
        .upload(fileName, imageBlob);

      if (error) throw error;

      // ✅ Correct way to get the public URL
      const publicUrl = supabase.storage.from("receipts").getPublicUrl(fileName).data.publicUrl;

      console.log("✅ Image uploaded successfully:", publicUrl);
      setUploading(false);
      return publicUrl;
    } catch (error) {
      console.error("❌ Image upload failed:", error);
      setUploading(false);
      return null;
    }
  };

  const storeReceiptInDatabase = async (imageUrl: string) => {
    try {
      const { data, error } = await supabase.from("receipts").insert([
        {
          budget_id: budgetId,
          budget_name: budgetName,
          image_url: imageUrl, // ✅ Save image URL in database
          username: username,  // Add the username to the database
        },
      ]);

      if (error) throw error;

      console.log("✅ Receipt stored in database:", data);
    } catch (error) {
      console.error("❌ Failed to store receipt in database:", error);
    }
  };

  const handleLiveCapture = async () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
          if (blob) {
            console.log("", blob);
            const imageUrl = await uploadToSupabase(blob);
            if (imageUrl) {
              await storeReceiptInDatabase(imageUrl);
              onCapture(imageUrl);
            }
          }
        }, "image/png");
      }
    }
  };

  const handleFileCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Uploaded image file:", file);
      const imageUrl = await uploadToSupabase(file);
      if (imageUrl) {
        await storeReceiptInDatabase(imageUrl);
        onCapture(imageUrl);
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="camera-container">
    <h2 className="scan-text">Scan Receipt (Budget: {budgetName})</h2>
  
    {/* Display Username */}
    <p className="username-text">User: {username}</p>
  
    <div className="camera-frame">
      {cameraError ? (
        <p className="text-danger">{cameraError}</p>
      ) : (
        <video ref={videoRef} autoPlay className="camera-feed" />
      )}
      <canvas ref={canvasRef} className="hidden-canvas" />
    </div>
  
    <div className="controls">
      <button className="icon-button" onClick={handleUploadClick}>
        <i className="bi bi-image"></i>
      </button>
      <input
        type="file"
        accept="image/*"
        className="hidden-file-input"
        ref={fileInputRef}
        onChange={handleFileCapture}
      />
      <button className="icon-button capture" onClick={handleLiveCapture} disabled={uploading}>
        {uploading ? "" : <i className="bi bi-camera"></i>}
      </button>
      <button className="icon-button" onClick={handleSwitchCamera}>
        <i className="bi bi-arrow-repeat"></i>
      </button>
    </div>
  </div>
  
  );
};

export default CameraCapture;
