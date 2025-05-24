import React from "react";
import { useNavigate } from "react-router-dom";
import "./SignupPage.css";

export default function SignupPage() {
  const navigate = useNavigate();

  return (
    <div className="signup-bg">
      <div className="signup-card">
        <div className="signup-header">
          <h1 className="signup-title">회원가입</h1>
          <p className="signup-subtitle">응급상황에서도 안전하게!</p>
        </div>
        <form className="signup-form">
          <input className="signup-input" type="text" placeholder="이름" />
          <input className="signup-input" type="text" placeholder="아이디(이메일)" />
          <input className="signup-input" type="password" placeholder="비밀번호" />
          <input className="signup-input" type="password" placeholder="비밀번호 확인" />
          <button className="signup-btn main" type="submit">가입하기</button>
          <button
            className="signup-btn sub"
            type="button"
            onClick={() => navigate("/")}
          >
            돌아가기
          </button>
        </form>
      </div>
    </div>
  );
}
