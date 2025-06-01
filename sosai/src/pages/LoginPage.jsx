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
          <p className="login-subtitle">나 스스로 지키자</p>
        </div>
        <div className="login-btn-group">
          <button className="login-btn main" onClick={() => navigate("/medical")}>
            의료 기초사항 작성하기
          </button>
          <div className="login-btn-row">
            <button className="login-btn sub" onClick={() => navigate("/voice")}>
              시작하기
            </button>
            <button className="login-btn sub outline" onClick={() => navigate("/signup")}>
              회원가입
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
