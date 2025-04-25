import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CameraCapture from "../components/CameraCapture";
import OCRProcessor from "../components/OCRProcessor";
import supabase from "../supabase";
import "bootstrap/dist/css/bootstrap.min.css";


const ReceiptScanner = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const budgetId = location.state?.budgetId || "No Budget Selected";
  const budgetName = location.state?.budgetName || "Unknown Budget";
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [username, setUsername] = useState<string>("Unknown User");
  const [structuredData, setStructuredData] = useState<{ item: string; quantity: string; price: string; total: string }[]>([]);
  
  // Retrieve username from sessionStorage
  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  console.log("Username in ReceiptScanner:", username);

  const handleCapture = (image: string) => {
    setCapturedImages((prevImages) => [...prevImages, image]);
  };

  const uploadReceipt = async (image: string) => {
    if (!username || username === "UnknownUser") {
      alert("Error: Username not found! Please log in again.");
      return;
    }

    try {
      const response = await fetch(image);
      const blob = await response.blob();
      const fileName = `receipt_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: "image/jpeg" });

      const { data, error } = await supabase.storage
        .from("receipts")
        .upload(fileName, file);

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("receipts")
        .getPublicUrl(data.path);

      await supabase.from("receipts").insert([
        {
          budget_id: budgetId,
          budget_name: budgetName,
          receipt_image_url: publicUrlData.publicUrl,
          username: username,
        },
      ]);

      console.log("Receipt uploaded successfully!");
    } catch (err) {
      console.error("Upload Error:", err);
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex flex-column align-items-center justify-content-center p-3">
      {/* Back & Logout Buttons */}
      <div className="d-flex justify-content-between w-100 position-absolute top-0 start-0 p-3">
  {/* Back Button (Icon Only) */}
  <button className="btn btn-primary" onClick={() => navigate(-1)}>
    <i className="bi bi-arrow-left"></i>
  </button>

  {/* Logout Button (Icon Only) */}
  <button className="btn btn-primary" onClick={() => navigate("/login")}>
    <i className="bi bi-box-arrow-right"></i>
  </button>
</div>


      {/*  Page Title */}
      {/* <h2 className="text-center mt-5 fw-bold">Receipt Scanner</h2>
      <p className="text-muted">Budget: <strong>{budgetName}</strong></p> */}

      {/*  Camera & OCR Section */}
      <div className="w-100 d-flex flex-column align-items-center">
        {capturedImages.length === 0 ? (
         <CameraCapture onCapture={handleCapture} username={username} />

        ) : (
          <OCRProcessor
          // ocrText={ocrText}  // ✅ Now ocrText is always defined
          images={capturedImages || []}  // ✅ Default to empty array
          selectedBudgetId={budgetId}
          selectedBudgetName={budgetName}
          onSaveReceipt={uploadReceipt}
          username={username}
      />

        )}
      </div>
    </div>
  );
};

export default ReceiptScanner;
