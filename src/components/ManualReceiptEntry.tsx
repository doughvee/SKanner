import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import supabase from "../supabase";
import "bootstrap/dist/css/bootstrap.min.css";
import "./ManualReceiptEntry.css";

interface ManualItem {
  item_name: string;
  quantity: number;
  unit_price: number;
  proofImage: File | null;
  receipt_id: string;
  username: string;
  budget_name: string;
  status: string;
}

const ManualEntry = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const budgetId = location.state?.budgetId || "No Budget Selected";
  const budgetName = location.state?.budgetName || "Unknown Budget";
  const [username, setUsername] = useState<string>("Unknown User");
  const [receiptId, setReceiptId] = useState("");
  const [items, setItems] = useState<ManualItem[]>([]);
  const [item_name, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit_price, setUnitPrice] = useState<number | "">(0);
  const [proofImages, setProofImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null); 
  const [imageWarning, setImageWarning] = useState("");


  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  useEffect(() => {
    const fetchReceiptId = async () => {
      const { data, error } = await supabase
        .from("receipts")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching receipt ID:", error);
      } else {
        setReceiptId(data.id);
      }
    };
    fetchReceiptId();
  }, []);

  const totalAmount = items.reduce((total, item) => total + item.quantity * item.unit_price, 0);

  const handleBack = () => navigate(-1);
  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  const handleAddItem = () => {
    if (!item_name || quantity <= 0 || unit_price === "" || unit_price <= 0) {
      alert("Please fill in all fields.");
      return;
    }
  
    if (proofImages.length === 0) {
      setImageWarning("Please attach at least one proof image before adding the item.");
      return;
    }
    setImageWarning(""); // Clear warning if image is attached
    
  
    const newItem: ManualItem = {
      item_name,
      quantity,
      unit_price: Number(unit_price),
      proofImage: proofImages[proofImages.length - 1], // last uploaded image
      receipt_id: receiptId,
      username,
      budget_name: budgetName,
      status: "Manual"
    };
  
    if (editIndex !== null) {
      const updatedItems = [...items];
      updatedItems[editIndex] = newItem;
      setItems(updatedItems);
      setEditIndex(null);
    } else {
      setItems([...items, newItem]);
    }
  
    // Clear form
    setItemName("");
    setQuantity(1);
    setUnitPrice(0);
    setProofImages([]);
  };
  

  const handleEdit = (index: number) => {
    const item = items[index];
    setItemName(item.item_name);
    setQuantity(item.quantity);
    setUnitPrice(item.unit_price);
    setEditIndex(index);
  };

  const handleDelete = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      alert("No items to upload.");
      return;
    }
  
    setUploading(true);
    setError("");
  
    try {
      // Upload images and store URLs
      const uploadedImageUrls = await Promise.all(
        items.map(async (item) => {
          if (!item.proofImage) return { imageUrl: null, fileName: null }; // No image for this item
  
          const filePath = `manual_${Date.now()}_${item.proofImage.name}`;
          const { data: fileData, error: uploadError } = await supabase.storage
            .from("manual-item-images")
            .upload(filePath, item.proofImage);
  
          if (uploadError) {
            console.error("Upload error:", uploadError.message);
            throw uploadError;
          }
  
          // Get the public URL
          const { data } = supabase.storage.from("manual-item-images").getPublicUrl(filePath);
          return { imageUrl: data.publicUrl, fileName: item.proofImage.name };
        })
      );
  
      // Attach image URLs to items
      const uploadedItems = items.map((item, index) => {
        const matchingImage = uploadedImageUrls[index];
        return {
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          receipt_id: item.receipt_id,
          username: item.username,
          budget_name: item.budget_name,
          status: item.status,
          image_url: matchingImage.imageUrl, // Assign uploaded image URL
          total_amount: item.quantity * item.unit_price
        };
      });
  
      // Insert items into the database
      const { error: insertError } = await supabase.from("receipt_items").insert(uploadedItems);
  
      if (insertError) {
        console.error("Database insert error:", insertError);
        alert(`Database insert error: ${insertError.message}`);
        throw insertError;
      }
  
      alert("Items uploaded successfully!");
      setItems([]);
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Failed to upload items.");
    } finally {
      setUploading(false);
    }
  };
  
    return (
      <div className="container py-3">
        {/*  Back & Logout Buttons */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          {/* Back Button */}
          <button className="btn btn-primary" onClick={handleBack}>
            <i className="bi bi-arrow-left"></i>
          </button>
  
          {/* <h4 className="m-0 text-center flex-grow-1">Manual Receipt Entry</h4>
   */}
          {/* Logout Button */}
          <button className="btn btn-primary" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right"></i>
          </button>
        </div>
  
        <h6 className="text-center">Budget Plan: <strong>{budgetName}</strong></h6>
  
        {/*  Form Section */}
        <div className="manual-form  p-4 rounded shadow-sm">
          <label>Item Name</label>
          <input type="text" className="form-control mb-2" placeholder="Enter Item Name" value={item_name} onChange={(e) => setItemName(e.target.value)} />
  
          <label>Quantity</label>
          <input type="number" className="form-control mb-2" placeholder="Enter Quantity" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
  
          <label>Price</label>
          <input
            type="text"
            className="form-control mb-2"
            placeholder="Enter Price"
            value={unit_price === 0 ? "" : unit_price}
            onChange={(e) => {
              const value = e.target.value.trim();
              setUnitPrice(value === "" ? 0 : parseFloat(value) || unit_price);
            }}
          />
  
  <label>Proof Images</label>
<input
  type="file"
  multiple
  className="form-control mb-2"
  onChange={(e) => setProofImages(Array.from(e.target.files || []))}
/>
{imageWarning && (
  <div className="alert alert-danger mt-2 py-2" role="alert">
    {imageWarning}
  </div>
)}

          <button className="btn btn-primary w-100" onClick={handleAddItem}>
            {editIndex !== null ? "Update Item" : "Add Item"}
          </button>
        </div>
  
        {/* ✅ Responsive Table (Fits Perfectly on Mobile) */}
{items.length > 0 && (
  <div className="mt-4">
    <h4 className="text-center">Items Added:</h4>
    
    <div className="table-responsive overflow-x-auto">
      <table className="table table-bordered table-striped text-sm">
        <thead className="table-dark text-center">
          <tr>
            <th style={{ maxWidth: "120px" }}>Item Name</th>
            <th style={{ width: "50px" }}>Qty</th>
            <th style={{ width: "70px" }}>Price</th>
            <th style={{ width: "80px" }}>Total</th>
            <th style={{ maxWidth: "100px" }}>Proof</th>
            <th style={{ width: "80px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td className="text-truncate">{item.item_name}</td>
              <td className="text-center">{item.quantity}</td>
              <td className="text-center">₱{item.unit_price.toFixed(2)}</td>
              <td className="text-center">₱{(item.quantity * item.unit_price).toFixed(2)}</td>
              <td className="text-center">
                {item.proofImage ? (
                  <span className="text-success fw-bold">
                    <i className="bi bi-check-circle"></i>
                  </span>
                ) : (
                  <span className="text-danger fw-bold">
                    <i className="bi bi-x-circle"></i>
                  </span>
                )}
              </td>
              <td className="text-center">
                <div className="d-flex justify-content-center gap-1">
                  <button className="btn btn-info btn-sm" onClick={() => handleEdit(index)}>
                    <i className="bi bi-pencil"></i>
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(index)}>
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

{/* ✅ Upload Button (Full Width on All Devices) */}
<button className="btn btn-primary w-100 mt-3" onClick={handleSubmit}>
  {uploading ? "Uploading..." : "Upload to Budget Plan"}
</button>

{error && <p className="text-danger mt-3 text-center">{error}</p>}


      </div>
    );
  };
  
  export default ManualEntry;
  