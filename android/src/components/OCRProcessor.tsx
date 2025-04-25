import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Tesseract from "tesseract.js";
import supabase from "../supabase";
import "./OCRProcessor.css";
import "bootstrap/dist/css/bootstrap.min.css";

interface OCRProcessorProps {
  images: string[];
  selectedBudgetId: any;
  selectedBudgetName: any;
  onSaveReceipt: (image: string) => Promise<void>;
  username: string;
}

const OCRProcessor: React.FC<OCRProcessorProps> = ({
  images,
  selectedBudgetId,
  selectedBudgetName,
  onSaveReceipt,
  username,
}) => {
  const [items, setItems] = useState<{ name: string; quantity: string; price: string; amount: string }[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (images.length === 0) return;
    setIsExtracting(true);
    uploadScannedReceipt(images[0]);
    extractReceiptData(images);
  }, [images]);

  useEffect(() => {
    if (items.length > 0) {
      setIsExtracting(false);
    }
  }, [items]);

  const uploadScannedReceipt = async (image: string) => {
    try {
      const response = await fetch(image);
      const blob = await response.blob();
      const fileName = `receipt_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: "image/jpeg" });

      const { data, error } = await supabase.storage.from("receipts").upload(fileName, file);
      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from("receipts").getPublicUrl(data.path);
      setReceiptImageUrl(publicUrlData.publicUrl);
    } catch (err) {
      console.error("🚨 Upload Error:", err);
      setError("Failed to upload scanned receipt image.");
    }
  };

 // ✅ Extract text from receipt images using OCR
 const extractReceiptData = async (images: string[]) => {
  setError("");
  let newItems: { name: string; quantity: string; price: string; amount: string }[] = [];
  let computedTotal = 0;

  for (const image of images) {
    try {
      const { data: { text } } = await Tesseract.recognize(image, "eng");
      let lines = text.split("\n").map(line => line.trim()).filter(line => line !== "");
      lines = lines.map(line => line.replace(/O/g, "0").replace(/S/g, "5").replace(/,/g, ".").replace(/\s{2,}/g, " "));

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // ✅ Format: ITEM_NAME  QTY  PRICE  TOTAL
        const singleLineRegex = /^(.+?)\s+(\d+)\s+(\d+\.\d{2})\s+(\d+\.\d{2})$/;
        const singleMatch = line.match(singleLineRegex);
        if (singleMatch) {
          newItems.push({
            name: singleMatch[1].trim(),
            quantity: singleMatch[2],
            price: singleMatch[3],
            amount: singleMatch[4],
          });
          computedTotal += parseFloat(singleMatch[4]);
          continue;
        }

        // ✅ Format: ITEM_NAME PRICE (no quantity)
        const itemOnlyRegex = /^(.+?)\s+₱?(\d+\.\d{2})$/;
        const itemOnlyMatch = line.match(itemOnlyRegex);
        if (itemOnlyMatch) {
          newItems.push({
            name: itemOnlyMatch[1].trim(),
            quantity: "1",
            price: itemOnlyMatch[2],
            amount: itemOnlyMatch[2],
          });
          computedTotal += parseFloat(itemOnlyMatch[2]);
          continue;
        }
      }
    } catch (err) {
      console.error("🚨 OCR Error:", err);
      setError("Failed to extract text from an image.");
    }
  }
  setItems(newItems);
  setTotalAmount(computedTotal);
};


  const uploadToSupabase = async () => {
    if (!receiptImageUrl) return setError("Receipt image not found!");
    if (items.length === 0) return setError("No items to upload!");
    if (!username) return setError("User not found!");

    try {
      setUploading(true);
      setError("");
      const { data: receiptData, error: receiptError } = await supabase
        .from("receipts")
        .insert([{ 
          budget_id: selectedBudgetId, 
          budget_name: selectedBudgetName, 
          total_amount: totalAmount, 
          image_url: receiptImageUrl, 
          username
        }])
        .select("id")
        .single();

      if (receiptError) throw receiptError;
      const receiptId = receiptData.id;
      const allItems = items.map(item => ({
        receipt_id: receiptId,
        item_name: item.name,
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.price),
        total_amount: parseFloat(item.amount),
        image_url: receiptImageUrl,
        username
      }));

      const { error: itemsError } = await supabase.from("receipt_items").insert(allItems);
      if (itemsError) throw itemsError;

      alert("Items and Receipt Image uploaded successfully!");
      setIsUploaded(true);
    } catch (err) {
      console.error("🚨 Upload error:", err);
      setError("Failed to upload receipt data.");
    } finally {
      setUploading(false);
    }
  };

  const handleScanAnother = () => {
    navigate("/scanner", { state: { selectedBudgetId, selectedBudgetName } });
  };
  
  return (
    <div className="ocr-container">
      <h3>Budget Plan: <strong>{selectedBudgetName}</strong></h3>
      <h5>User: <strong>{username}</strong></h5>
      
      {!isUploaded ? (
        isExtracting ? (
          <p className="text-center text-secondary">Extracting data... Please wait.</p>
        ) : items.length > 0 ? (
          <>
            <table className="ocr-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>₱{item.price}</td>
                    <td>₱{item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>Total Amount: ₱{totalAmount.toFixed(2)}</h3>
            <button onClick={uploadToSupabase} className="btn btn-primary w-50 mt-3">
              {uploading ? "Uploading..." : "Upload to Budget Plan"}
            </button>
          </>
        ) : (
          <p className="text-center text-secondary">No valid items found.</p>
        )
      ) : (
        <div className="mt-3 text-center">
          <button className="btn btn-success me-2" onClick={() => window.location.reload()}>
            Scan Another
          </button>
  
        </div>
      )}
      
      {error && <p className="text-danger mt-3">{error}</p>}
    </div>
  
  );
};

export default OCRProcessor;