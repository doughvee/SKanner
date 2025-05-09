import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabase";
import "bootstrap/dist/css/bootstrap.min.css";
import "./BudgetSelection.css";
import { useLocation } from "react-router-dom";

interface Budget {
  id: number;
  name: string;
}

const BudgetSelection = () => {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>("");
  const [selectedBudgetName, setSelectedBudgetName] = useState<string>("");
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    // Fetch the logged-in user's username from sessionStorage
    const storedUsername = sessionStorage.getItem("username") || "UnknownUser";
    setUsername(storedUsername);

    // Fetch the available budget plans
    fetchBudgets();
  }, []);

  // Fetch budget plans from Supabase
  const fetchBudgets = async () => {
    const { data, error } = await supabase.from("budget_plans").select("*");

    if (error) {
      console.error("Error fetching budgets:", error.message);
    } else {
      setBudgets(data);
    }
  };

  const handleScanReceipt = () => {
    if (!selectedBudgetId) {
      alert("Please select a budget plan first!");
      return;
    }
    navigate("/scanner", { state: { budgetId: selectedBudgetId, budgetName: selectedBudgetName, username: username } });
  };

  const handleManualEntry = () => {
    if (!selectedBudgetId) {
      alert("Please select a budget plan first!");
      return;
    }
    navigate("/manual-entry", { state: { budgetId: selectedBudgetId, budgetName: selectedBudgetName, username: username } });
  };


  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <div className="container d-flex flex-column align-items-center justify-content-center vh-100 text-white position-relative">
      
            <div className="position-absolute top-0 w-100 d-flex justify-content-between p-3">
        {/* Back Button (Left) */}
        <div></div> {/* Empty div to keep space */}
        
        {/* Logout Button (Right) */}
        <button className="btn btn-primary ms-auto" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right"></i>
        </button>
      </div>
  
      <h3 className="mt-5">
  Annual Barangay Youth <br /> Investment Program
      </h3>
      <select
        className="form-control w-75 mb-3"
        value={selectedBudgetId}
        onChange={(e) => {
          const selectedId = e.target.value;
          const selectedBudget = budgets.find((budget) => budget.id.toString() === selectedId);
  
          setSelectedBudgetId(selectedId);
          setSelectedBudgetName(selectedBudget ? selectedBudget.name : "");
        }}
      >
        <option value="">Select Program/Project/Activity</option>
        {budgets.map((budget) => (
          <option key={budget.id} value={budget.id}>{budget.name}</option>
        ))}
      </select>
  
      <button className="btn btn-primary w-50 mt-3" onClick={handleScanReceipt}>
        Scan Receipt
      </button>
  
      <button className="btn btn-secondary w-50 mt-3" onClick={handleManualEntry}>
        Manual Entry
      </button>
  
    </div>
  );
    
};

export default BudgetSelection;
