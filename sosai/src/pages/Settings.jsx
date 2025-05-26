import React, { useState, useRef, useEffect } from "react";
import NavBar from "../components/NavBar";
import "./SettingsPage.css";

export default function Settings() {
  const defaultImg = "https://cdn-icons-png.flaticon.com/512/147/147144.png";

  const [profileImg, setProfileImg] = useState(() => {
    return localStorage.getItem("profileImg") || defaultImg;
  });

  const [name, setName] = useState("이름 없음");
  const fileInput = useRef(null);

  // 이름 로딩
  useEffect(() => {
    const saved = localStorage.getItem("myMedical");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.name) setName(parsed.name);
      } catch (e) {
        console.error("이름 불러오기 실패:", e);
      }
    }
  }, []);

  const handleImgChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setProfileImg(ev.target.result);
        localStorage.setItem("profileImg", ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImgClick = () => {
    fileInput.current.click();
  };

  return (
    <div className="page-container">
      <div className="center" style={{ marginTop: 18 }}>
        {/* 프로필 이미지 */}
        <img
          src={profileImg}
          alt="Profile"
          className="profile-img"
          style={{ cursor: "pointer" }}
          onClick={handleImgClick}
          title="이미지 클릭으로 변경"
        />
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          ref={fileInput}
          onChange={handleImgChange}
        />

        {/* 이름 (연동된 값으로 출력) */}
        <div style={{ fontWeight: 700, color: "#2655b8", fontSize: "1.18rem", marginTop: 10 }}>
          {name}
        </div>

        <hr style={{ width: "70%", margin: "18px auto 0 auto", borderColor: "#e7e7ef" }} />
      </div>

      {/* 설정 버튼 목록 */}
      <div className="settings-list">
        <button className="settings-btn">나에 대해 작성하기</button>
        <button className="settings-btn">위치기반 허용하기</button>
        <button className="settings-btn">Privacy Policy</button>
        <button className="settings-btn">Share this app</button>
        <button className="settings-btn logout">Logout</button>
      </div>

      <NavBar active="settings" />
    </div>
  );
}
