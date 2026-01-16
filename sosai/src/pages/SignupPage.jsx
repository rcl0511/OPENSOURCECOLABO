import React from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">SOSAI</h1>
          <p className="login-subtitle">실시간 응급 가이드 앱</p>
        </div>

        <div className="login-btn-group">
          <div className="login-btn-row">
            <button className="login-btn sub" onClick={() => navigate("/voice")}>
              시작하기
            </button>

            <button
              className="login-btn sub outline"
              onClick={() => navigate("/signup")}
            >
              회원가입
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
