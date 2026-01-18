import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SignupPage.css"; // 너 프로젝트에 맞게 경로/이름 조정

export default function SignupPage() {
  const navigate = useNavigate();

  const BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "https://api.rcl0511.xyz";

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    // 간단 검증
    if (!form.email || !form.password || !form.name) {
      setErrorMsg("이메일/비밀번호/이름을 모두 입력해 주세요.");
      return;
    }
    if (form.password.length < 6) {
      setErrorMsg("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          name: form.name.trim(),
        }),
      });

      // 에러 처리
      if (!res.ok) {
        let detail = "";
        try {
          const data = await res.json();
          detail = data?.detail || data?.error || "";
        } catch {
          detail = await res.text();
        }

        if (res.status === 409) {
          throw new Error("이미 가입된 이메일입니다.");
        }
        throw new Error(detail || `회원가입 실패 (HTTP ${res.status})`);
      }

      const data = await res.json();

      // ✅ 토큰 저장 (VoicePage에서 token 키를 찾도록 이미 만들어둠)
      if (data?.token) {
        localStorage.setItem("token", data.token);
      }

      // (선택) user 정보도 저장하고 싶으면
      if (data?.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // ✅ 가입 성공 → medical로 이동
      navigate("/medical");
    } catch (err) {
      setErrorMsg(err.message || "회원가입 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-bg">
      <div className="signup-card">
        <h2 className="signup-title">회원가입</h2>

        <form className="signup-form" onSubmit={onSubmit}>
          <label>
            이메일
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              placeholder="example@email.com"
              autoComplete="off"
              required
            />
          </label>

          <label>
            비밀번호
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder="6자 이상"
              required
            />
          </label>

          <label>
            이름
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder="이름"
              autoComplete="off"
              required
            />
          </label>

          {errorMsg && (
            <div style={{ marginTop: 10, color: "crimson", fontSize: 13 }}>
              {errorMsg}
            </div>
          )}

          <button className="signup-btn" type="submit" disabled={loading}>
            {loading ? "가입 중..." : "가입하기"}
          </button>

          <button
            className="signup-btn outline"
            type="button"
            onClick={() => navigate("/")}
            disabled={loading}
            style={{ marginTop: 10 }}
          >
            돌아가기
          </button>
        </form>
      </div>
    </div>
  );
}
