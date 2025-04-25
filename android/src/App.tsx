import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginScreen from "./pages/LoginScreen";
import BudgetSelection from "./pages/BudgetSelection";
import ReceiptScanner from "./pages/ReceiptScanner";
import "bootstrap/dist/css/bootstrap.min.css";
import "./pages/LoginScreen.css";
import "./pages/BudgetSelection.css";
import ManualReceiptEntry from "./components/ManualReceiptEntry";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} /> {/* Redirect to login */}
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/budget" element={<BudgetSelection />} />
        <Route path="/scanner" element={<ReceiptScanner />} />
        <Route path="/manual-entry" element={<ManualReceiptEntry />} />
      </Routes>
    </Router>
  );
}

export default App;



