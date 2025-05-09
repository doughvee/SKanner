import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Tesseract from "tesseract.js";
import supabase from "../supabase";
import "./OCRProcessor.css";
import "bootstrap/dist/css/bootstrap.min.css";

interface OCRProcessorProps {
  images?: string[];
  selectedBudgetId?: any;
  selectedBudgetName?: any;
  onSaveReceipt?: (image: string) => Promise<void>;
  username?: string;
}


const OCRProcessor: React.FC<OCRProcessorProps> = ({
  images,
  selectedBudgetId,
  selectedBudgetName,
  username,
}) => {

  const [items, setItems] = useState<{ name: string; quantity: string; price: string; amount: string }[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [cleanedText, setCleanedText] = useState(""); // State to store cleaned OCR text
  const [showAlert, setShowAlert] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isExtracting && items.length === 0) {
      setShowAlert(true);
    }
  }, [isExtracting, items]);

  useEffect(() => {
    if (!images || images.length === 0) return;

    setIsExtracting(true);
    setItems([]);
    uploadScannedReceipt(images[0]);
    extractReceiptData(images[0]);
  }, [images]);

 

  const uploadScannedReceipt = async (image: string) => {
    try {
      const response = await fetch(image);
      const blob = await response.blob();
      const fileName = `receipt_${Date.now()}.jpg`; // ✅ Fixed Syntax
  
      const file = new File([blob], fileName, { type: "image/jpeg" });
  
      const { data, error } = await supabase.storage.from("receipts").upload(fileName, file);
      if (error) throw error;
  
      // ✅ Corrected Public URL Retrieval
      const { data: publicUrlData } = supabase.storage.from("receipts").getPublicUrl(fileName);
      setReceiptImageUrl(publicUrlData?.publicUrl || ""); // Ensure no undefined errors
  
    } catch (err: any) {
      console.error("🚨 Upload Error:", err);
      setError("Failed to upload scanned receipt image.");
    }
  };

  const extractReceiptData = async (image: string) => {
  setError("");
  let newItems: { name: string; quantity: string; price: string; amount: string }[] = [];
  let computedTotal = 0;
  let extractedText = "";

  try {
    const { data } = await Tesseract.recognize(image, "eng");
    let rawText = data.text;

    console.log("OCR Raw Text:", rawText);

    // Clean and normalize
    let lines = rawText
      .split("\n")
      .map(line => line.trim().toLowerCase())
      .filter(line => line !== "")
      .map(line =>
        line
          .replace(/O/g, "0")
          .replace(/S/g, "5")
          .replace(/,/g, ".")
          .replace(/\s{2,}/g, " ")
          .replace(/[^a-zA-Z0-9₱.\s@-]/g, "")
          .replace(/\s+/g, " ") // normalize spaces
      );

    console.log("Cleaned OCR Text:", lines.join("\n"));
    extractedText = lines.join("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Ignore non-item lines
      if (
        line.includes("total") ||
        line.includes("vat") ||
        line.includes("sales") ||
        line.includes("exempt") ||
        line.includes("change") ||
        line.length < 5
      ) {
        continue;
      }

      let match;

      // Format 1: ITEM PRICE
      match = line.match(/^([a-z\s]+)\s+₱?(\d+\.\d{2})$/);
      if (match) {
        newItems.push({
          name: match[1].trim(),
          quantity: "1",
          price: match[2],
          amount: match[2],
        });
        computedTotal += parseFloat(match[2]);
        continue;
      }

      // Format 2: QTY ITEM AMOUNT
      match = line.match(/^(\d+)\s+(.+?)\s+₱?(\d+\.\d{2})$/);
      if (match) {
        newItems.push({
          name: match[2].trim(),
          quantity: match[1],
          price: match[3],
          amount: match[3],
        });
        computedTotal += parseFloat(match[3]);
        continue;
      }

      // Format 3: QTY ITEM @ PRICE TOTAL
      match = line.match(/^(\d+)\s+(.+?)\s+@\s*₱?(\d+\.\d{2})\s+₱?(\d+\.\d{2})$/);
      if (match) {
        newItems.push({
          name: match[2].trim(),
          quantity: match[1],
          price: match[3],
          amount: match[4],
        });
        computedTotal += parseFloat(match[4]);
        continue;
      }

      // Format 4: ITEM QTY PRICE TOTAL
      match = line.match(/^(.+?)\s+(\d+)\s+₱?(\d+\.\d{2})\s+₱?(\d+\.\d{2})$/);
      if (match) {
        newItems.push({
          name: match[1].trim(),
          quantity: match[2],
          price: match[3],
          amount: match[4],
        });
        computedTotal += parseFloat(match[4]);
        continue;
      }

      // Format 5: ITEM - QTY @ PRICE = TOTAL
      match = line.match(/^(.+?)\s*-\s*(\d+)\s*@\s*(\d+\.\d{2})\s*=\s*(\d+\.\d{2})$/);
      if (match) {
        newItems.push({
          name: match[1].trim(),
          quantity: match[2],
          price: match[3],
          amount: match[4],
        });
        computedTotal += parseFloat(match[4]);
        continue;
      }

      // Format 6: ITEM (Next Line) QTY x PRICE = TOTAL
      match = lines[i + 1]?.match(/^(\d+)\s*x\s*(\d+\.\d{2})\s*(\d+\.\d{2})?$/);
      if (match) {
        newItems.push({
          name: line.trim(),
          quantity: match[1],
          price: match[2],
          amount: match[3] ? match[3] : (parseFloat(match[1]) * parseFloat(match[2])).toFixed(2),
        });
        computedTotal += parseFloat(match[3] ?? (parseFloat(match[1]) * parseFloat(match[2])));
        i++; // skip next line
        continue;
      }

      // Format 7: ITEM (Next Line) PRICE TOTAL
      match = lines[i + 1]?.match(/^₱?(\d+\.\d{2})\s+₱?(\d+\.\d{2})$/);
      if (match) {
        newItems.push({
          name: line.trim(),
          quantity: "1",
          price: match[1],
          amount: match[2],
        });
        computedTotal += parseFloat(match[2]);
        i++; // skip next line
        continue;
      }

      // Format 8: QTY ITEM PRICE (fallback)
      match = line.match(/^(\d+)\s+([a-z\s]+)\s+(\d+\.\d{2})$/);
      if (match) {
        const qty = match[1];
        const itemName = match[2].trim();
        const price = match[3];
        const total = (parseFloat(qty) * parseFloat(price)).toFixed(2);

        newItems.push({
          name: itemName,
          quantity: qty,
          price: price,
          amount: total,
        });
        computedTotal += parseFloat(total);
        continue;
      }
// Format 9: ITEM (Next Line) QTY x PRICE
match = lines[i + 1]?.match(/^(\d+)\s*x\s*(\d+\.\d{2})$/);
if (match) {
  newItems.push({
    name: line.trim(),
    quantity: match[1],
    price: match[2],
    amount: (parseFloat(match[1]) * parseFloat(match[2])).toFixed(2),
  });
  computedTotal += parseFloat((parseFloat(match[1]) * parseFloat(match[2])).toFixed(2));
  i++; // skip next line
  continue;
}

// Format 10: ITEM (Next Line) QTY x PRICE = TOTAL
match = lines[i + 1]?.match(/^(\d+)\s*x\s*(\d+\.\d{2})\s*=\s*(\d+\.\d{2})$/);
if (match) {
  newItems.push({
    name: line.trim(),
    quantity: match[1],
    price: match[2],
    amount: match[3],
  });
  computedTotal += parseFloat(match[3]);
  i++; // skip next line
  continue;
}

// Format 11: ITEM QTY@PRICE (One Line)
match = line.match(/^(.+?)\s+(\d+)@(\d+\.\d{2})$/);
if (match) {
  const qty = match[2];
  const price = match[3];
  const total = (parseFloat(qty) * parseFloat(price)).toFixed(2);
  newItems.push({
    name: match[1].trim(),
    quantity: qty,
    price: price,
    amount: total,
  });
  computedTotal += parseFloat(total);
  continue;
}

// Format 12: QTY ITEM PRICE (with optional 'v' at end)
match = line.match(/^(\d+)\s+(.+?)\s+(\d+\.\d{2})v?$/);
if (match) {
  const qty = match[1];
  const itemName = match[2].trim();
  const price = match[3];
  const total = (parseFloat(qty) * parseFloat(price)).toFixed(2);

  newItems.push({
    name: itemName,
    quantity: qty,
    price: price,
    amount: total,
  });
  computedTotal += parseFloat(total);
  continue;
}

      // Debug skipped lines
      console.log("Skipped line (no match):", line);
    }
  } catch (err) {
    console.error("OCR Error:", err);
    setError("Failed to extract text from the image.");
  }

  setItems(newItems);
  setTotalAmount(computedTotal);
  setCleanedText(extractedText);
  setIsExtracting(false);
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
        username,
        budget_name: selectedBudgetName
      }));

      const { error: itemsError } = await supabase.from("receipt_items").insert(allItems);
      if (itemsError) throw itemsError;

      alert("Items and Receipt Image uploaded successfully!");
      setIsUploaded(true);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError("Failed to upload receipt data.");
    } finally {
      setUploading(false);
    }
  };

  const handleScanAnother = () => {
    setItems([]);
    setTotalAmount(0);
    setIsUploaded(false);
    setShowAlert(false);
    setReceiptImageUrl(null);
    setError("");
    navigate(0);
  };

  return (
    <div className="container my-4">
      {/* Budget Name and User Info Section */}
      <div className="text-center mb-4">
        <h3>
          <strong>{selectedBudgetName}</strong>
        </h3>
        <p>User: <strong>{username}</strong></p>
      </div>
  
      {/* Scanned Items Table */}
      <div>
        {!isUploaded && !isExtracting && items.length > 0 && (
          <div className="table-responsive bg-light p-3 rounded border">
            <table className="table table-bordered table-hover table-striped mb-0">
              <thead className="table-dark text-center">
                <tr>
                  <th>Item Name</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody className="text-center uppercase">
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="uppercase">{item.name.toUpperCase()}</td>
                    <td className="uppercase">{item.quantity.toUpperCase()}</td>
                    <td className="uppercase">₱{parseFloat(item.price).toFixed(2).toUpperCase()}</td>
                    <td className="uppercase">₱{parseFloat(item.amount).toFixed(2).toUpperCase()}</td>
                  </tr>
                ))}
                {/* Total row */}
                {/* <tr className="table-secondary fw-bold">
                  <td colSpan={3} className="text-end">Total</td>
                  <td>₱{totalAmount.toFixed(2)}</td>
                </tr> */}
              </tbody>
            </table>
          </div>
        )}
      </div>
  
      {/* Conditional UI based on upload status */}
      {!isUploaded ? (
        isExtracting ? (
          <p className="text-secondary text-center mt-3">Extracting data... Please wait.</p>
        ) : items.length > 0 ? (
          <div className="d-flex justify-content-center mt-3">
            <button
              onClick={uploadToSupabase}
              className="btn btn-primary w-50"
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        ) : (
          <div className="text-center mt-3">
            <p className="text-danger">No valid items found.</p>
            <div className="d-flex justify-content-center mt-2">
              <button
                className="btn btn-primary w-50"
                onClick={handleScanAnother}
              >
                Scan Another
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="d-flex justify-content-center mt-3">
          <button
            className="btn btn-primary w-50"
            onClick={handleScanAnother}
          >
            Scan Another
          </button>
        </div>
      )}
    </div>
  );
  
};

export default OCRProcessor;


