import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  Phone,
  Stethoscope,
  Settings
} from "lucide-react";
import "./NavBar.css";

export default function NavBar({ active }) {
  const navigate = useNavigate();

  return (
    <div className="nav-bar">
      <div className={`nav-icon ${active === "home" ? "active" : ""}`} onClick={() => navigate("/voice")}>
        <Home size={28} />
        <div className="nav-label">Home</div>
      </div>
      <div className={`nav-icon ${active === "call" ? "active" : ""}`} onClick={() => navigate("/call")}>
        <Phone size={28} />
        <div className="nav-label">Call</div>
      </div>
      <div className={`nav-icon ${active === "medical" ? "active" : ""}`} onClick={() => navigate("/medical")}>
        <Stethoscope size={28} />
        <div className="nav-label">Medical</div>
      </div>
      <div className={`nav-icon ${active === "settings" ? "active" : ""}`} onClick={() => navigate("/settings")}>
        <Settings size={28} />
        <div className="nav-label">Settings</div>
      </div>
    </div>
  );
}
