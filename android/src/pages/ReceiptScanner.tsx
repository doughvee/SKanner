import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CameraCapture from "../components/CameraCapture";
import OCRProcessor from "../components/OCRProcessor";
import supabase from "../supabase";

const ReceiptScanner = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const budgetId = location.state?.budgetId || "No Budget Selected";
  const budgetName = location.state?.budgetName || "Unknown Budget";

  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [username, setUsername] = useState<string>("UnknownUser");

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
          username: username, // Now this should always be correct!
        },
      ]);

      console.log("Receipt uploaded successfully!");
    } catch (err) {
      console.error("Upload Error:", err);
    }
  };

  return (
    <div className="container mt-3 text-center position-relative">
      {/* Log Out Button in the Top Right Corner */}
      <button
        className="btn btn-outline-danger fw-bold rounded-pill shadow-sm position-absolute top-0 end-0 m-3"
        onClick={() => navigate("/login")}
        style={{
          fontSize: "1rem",
          padding: "8px 20px",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#dc3545")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <i className="bi bi-box-arrow-right me-2"></i> Log Out
      </button>

      {/* Show Camera if no images are captured */}
      {capturedImages.length === 0 ? (
        <CameraCapture onCapture={handleCapture} username={username} />
      ) : (
        <OCRProcessor
          images={capturedImages}
          selectedBudgetId={budgetId}
          selectedBudgetName={budgetName}
          onSaveReceipt={uploadReceipt}
          username={username}
        />
      )}
    </div>
  );
};

export default ReceiptScanner;
