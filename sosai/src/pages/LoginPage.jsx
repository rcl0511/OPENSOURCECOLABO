import React from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">SOSkin</h1>
          <p className="login-subtitle">화상 응급 가이드 앱</p>
        </div>
        <div className="login-btn-group">
<<<<<<< HEAD

=======
          <button className="login-btn main" onClick={() => navigate("/medical")}>
            의료 기초사항 작성하기
          </button>
>>>>>>> 70860896407a44768076bf476ca3efe331dc83bb
          <div className="login-btn-row">
            <button className="login-btn sub" onClick={() => navigate("/voice")}>
              시작하기
            </button>
<<<<<<< HEAD
            <button
              className="login-btn sub outline"
              onClick={() => navigate("/signup")}
            >
              사진찍기
=======
            <button className="login-btn sub outline" onClick={() => navigate("/signup")}>
              회원가입
>>>>>>> 70860896407a44768076bf476ca3efe331dc83bb
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
