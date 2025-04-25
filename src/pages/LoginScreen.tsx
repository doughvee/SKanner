import { useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabase";
import "bootstrap/dist/css/bootstrap.min.css";
import "./LoginScreen.css";

const LoginScreen = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Attempt to log the user in with the provided username and password
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single();

      if (userError || !user) {
        setError("User not found");
        setLoading(false);
        return;
      }

      // Check if the password matches (you should hash passwords in production)
      if (user.password !== password) {
        setError("Invalid credentials");
        setLoading(false);
        return;
      }

      // Store username in sessionStorage after successful login
      sessionStorage.setItem("username", user.username);

      // If login is successful, navigate to the BudgetSelection page
      navigate("/budget", { state: { username: user.username } });
      
    } catch (error) {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="container skbms-login-container d-flex flex-column align-items-center justify-content-center vh-100 text-white">
      <h2>Welcome to <span style={{ color: "#007bff" }}>SKANNER</span></h2>
      {error && <p className="text-danger">{error}</p>}
      <form className="skbms-login-form" onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          className="form-control skbms-login-input mb-2"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <div className="input-group mb-2">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="form-control skbms-login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setShowPassword(!showPassword)}
          >
            <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
          </button>
        </div>
        <button type="submit" className="btn skbms-login-btn w-100" disabled={loading}>
          {loading ? "Signing In..." : "Sign In"}
        </button>
      </form>
    </div>
  );
};

export default LoginScreen;
