import React from "react";
import { useNavigate } from "react-router-dom";
import "./NavBar.css";

export default function NavBar({ active }) {
  const navigate = useNavigate();

  return (
    <div className="nav-bar">
      <div className={`nav-icon ${active === "home" ? "active" : ""}`} onClick={() => navigate("/voice")}>
        <span role="img" aria-label="홈">🏠</span>
        <div className="nav-label">Home</div>
      </div>
      <div className={`nav-icon ${active === "call" ? "active" : ""}`} onClick={() => navigate("/call")}>
        <span role="img" aria-label="콜">☎️</span>
        <div className="nav-label">Call</div>
      </div>
      <div className={`nav-icon ${active === "medical" ? "active" : ""}`} onClick={() => navigate("/medical")}>
        <span role="img" aria-label="메디컬">💊</span>
        <div className="nav-label">Medical</div>
      </div>
      <div className={`nav-icon ${active === "settings" ? "active" : ""}`} onClick={() => navigate("/settings")}>
        <span role="img" aria-label="세팅">⚙️</span>
        <div className="nav-label">Settings</div>
      </div>
    </div>
  );
}
