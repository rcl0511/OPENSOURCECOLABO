import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import VoicePage from "./pages/VoicePage";
import CallPage from "./pages/CallPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/voice" element={<VoicePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/call" element={<CallPage />} />
        {/* 필요시 /medinfo 등 추가 */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
