import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import NavBar from "../components/NavBar";
import "./CallPage.css";

// leaflet 마커 기본 아이콘 설정 (이걸 안 하면 마커가 안 보임)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export default function CallPage() {
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState("주소를 불러오는 중입니다...");

  // 영상통화 버튼
  const handleVideoCall = () => {
    navigate("/video-call"); // 경로 조정하세요
  };

  // 119 전화 걸기 버튼
  const handleCall119 = () => {
    window.location.href = "tel:119";
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      alert("브라우저가 위치정보를 지원하지 않습니다.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setPosition(coords);

        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords[0]}&lon=${coords[1]}`
        )
          .then((res) => res.json())
          .then((data) => {
            if (data && data.display_name) {
              setAddress(data.display_name);
            } else {
              setAddress("주소를 찾을 수 없습니다.");
            }
          })
          .catch(() => {
            setAddress("주소를 불러오는데 실패했습니다.");
          });
      },
      (err) => {
        alert("위치 정보를 가져올 수 없습니다.");
        console.error(err);
        setAddress("위치 정보를 가져올 수 없습니다.");
      }
    );
  }, []);

  return (
    <div className="call-bg" style={{ padding: "10px" }}>
      <button className="call-back-btn" onClick={() => navigate(-1)}>
        ←
      </button>

      {/* 지도 */}
      <div
        style={{
          height: "250px", // 높이 조절
          width: "100%",
          marginTop: "20px",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        }}
      >
        {position ? (
          <MapContainer
            center={position}
            zoom={15}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={position}>
              <Popup>현재 위치</Popup>
            </Marker>
          </MapContainer>
        ) : (
          <p>위치 정보를 불러오는 중입니다...</p>
        )}
      </div>

      <div
        style={{
          marginTop: "10px",
          padding: "0 15px",
          fontSize: "0.9rem",
          minHeight: "40px",
          wordBreak: "break-word",
        }}
      >
        <strong>현재 주소:</strong> <br />
        {address}
      </div>

      {/* 구조요원 정보 및 버튼들 */}
      <div className="call-info" style={{ marginTop: "20px", textAlign: "center" }}>
        <div className="call-name" style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
          119 구조요원
        </div>
        <div className="call-title" style={{ marginBottom: "15px", fontSize: "1rem" }}>
          구조 요청 하기
        </div>
      </div>

      <div
        className="call-btns"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          marginBottom: "40px",
        }}
      >
        <button
          className="call-btn video"
          onClick={handleVideoCall}
          style={{
            padding: "12px 24px",
            fontSize: "1.5rem",
            borderRadius: "10px",
            cursor: "pointer",
          }}
          title="영상통화 연결"
        >
          📷
        </button>

        <button
          className="call-btn hangup"
          onClick={handleCall119}
          style={{
            padding: "12px 24px",
            fontSize: "1.5rem",
            borderRadius: "10px",
            cursor: "pointer",
          }}
          title="119 전화 걸기"
        >
          📞
        </button>

        <button
          className="call-btn more"
          style={{
            padding: "12px 24px",
            fontSize: "1.5rem",
            borderRadius: "10px",
            cursor: "pointer",
          }}
          title="더보기"
          onClick={() => alert("더보기 기능은 추후 구현 예정입니다.")}
        >
          ⋮
        </button>
      </div>

      <NavBar active="call" />
    </div>
  );
}
