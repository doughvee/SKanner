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
  const [editIndex, setEditIndex] = useState<number | null>(null); // ✅ FIXED

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

  const handleLogout = () => {
    sessionStorage.clear(); // Clear session
    navigate("/login"); // Redirect to login page
  };

  const handleAddItem = () => {
    if (!item_name || quantity <= 0 || unit_price === "" || unit_price <= 0) {
      alert("Please fill in all fields.");
      return;
    }

    const newItem: ManualItem = {
      item_name,
      quantity,
      unit_price: Number(unit_price),
      proofImage: proofImages.length > 0 ? proofImages[proofImages.length - 1] : null,
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
      const uploadedImageUrls = await Promise.all(
        proofImages.map(async (image) => {
          const filePath = `manual_${Date.now()}_${image.name}`;
          const { data: fileData, error: uploadError } = await supabase.storage
            .from("manual-item-images")
            .upload(filePath, image);

          if (uploadError) {
            console.error("Upload error:", uploadError.message);
            throw uploadError;
          }

          const { data } = supabase.storage.from("manual-item-images").getPublicUrl(filePath);
          return { imageUrl: data.publicUrl, fileName: image.name };
        })
      );

      const uploadedItems = items.map((item) => {
        const matchingImage = uploadedImageUrls.find(img => img.fileName === item.proofImage?.name);
        return {
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          receipt_id: item.receipt_id,
          username: item.username,
          budget_name: item.budget_name,
          status: item.status,
          image_url: matchingImage ? matchingImage.imageUrl : null,
          total_amount: item.quantity * item.unit_price
        };
      });

      const { error: insertError } = await supabase.from("receipt_items").insert(uploadedItems);

      if (insertError) {
        console.error("Database insert error:", insertError);
        alert(`Database insert error: ${insertError.message}`);
        throw insertError;
      }

      alert("Items uploaded successfully!");
      setItems([]);
      setProofImages([]);
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Failed to upload items.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="manual-container">
      {/* ✅ Logout Button */}
      <div className="d-flex justify-content-between align-items-center">
        <h3>Manual Receipt Entry</h3>
        <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
      </div>

      <h3>Budget Plan: <strong>{budgetName}</strong></h3>

      <div className="manual-form">
        <label>Item Name</label>
        <input type="text" placeholder="Enter Item Name" value={item_name} onChange={(e) => setItemName(e.target.value)} />

        <label>Quantity</label>
        <input type="number" placeholder="Enter Quantity" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />

        <label>Price</label>
        <input
          type="text"
          placeholder="Enter Price"
          value={unit_price === 0 ? "" : unit_price}
          onChange={(e) => {
            const value = e.target.value.trim();
            setUnitPrice(value === "" ? 0 : parseFloat(value) || unit_price);
          }}
        />

        <label>Proof Images</label>
        <input type="file" multiple onChange={(e) => setProofImages(Array.from(e.target.files || []))} />

        <button className="manual-btn" onClick={handleAddItem}>
          {editIndex !== null ? "Update Item" : "Add Item"}
        </button>
      </div>

      {items.length > 0 && (
        <>
          <h4>Items Added:</h4>
          <table className="manual-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
                <th>Proof Image</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>{item.item_name}</td>
                  <td>{item.quantity}</td>
                  <td>₱{item.unit_price.toFixed(2)}</td>
                  <td>₱{(item.quantity * item.unit_price).toFixed(2)}</td>
                  <td>{item.proofImage ? item.proofImage.name : "No image"}</td>
                  <td>
                    <button className="btn btn-info" onClick={() => handleEdit(index)}>Edit</button>
                    <button className="btn btn-warning" onClick={() => handleDelete(index)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <button className="manual-btn" onClick={handleSubmit}>{uploading ? "Uploading..." : "Upload to Budget Plan"}</button>
      {error && <p className="text-danger mt-3">{error}</p>}
    </div>
  );
};

export default ManualEntry;
