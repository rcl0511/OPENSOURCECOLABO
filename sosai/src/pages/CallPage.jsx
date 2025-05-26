import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import "./CallPage.css";

export default function CallPage() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState("주소를 불러오는 중입니다...");
  const [geoError, setGeoError] = useState(null);

  // 영상통화 버튼
  const handleVideoCall = () => {
    navigate("/video-call");
  };

  // 119 전화 걸기 버튼
  const handleCall119 = () => {
    window.location.href = "tel:119";
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("브라우저가 위치정보를 지원하지 않습니다.");
      setAddress("브라우저가 위치정보를 지원하지 않습니다.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        console.log("내 좌표:", coords.lat, coords.lng);
        setPosition(coords);

        if (window.kakao && window.kakao.maps) {
          const map = new window.kakao.maps.Map(mapRef.current, {
            center: new window.kakao.maps.LatLng(coords.lat, coords.lng),
            level: 3,
          });

          const marker = new window.kakao.maps.Marker({
            position: new window.kakao.maps.LatLng(coords.lat, coords.lng),
          });
          marker.setMap(map);

          const infowindow = new window.kakao.maps.InfoWindow({
            content: '<div style="padding:5px;font-size:15px;">현재 위치</div>',
          });
          infowindow.open(map, marker);

          // 주소 변환: 반드시 lng, lat 순서!
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.coord2Address(coords.lng, coords.lat, (result, status) => {
            console.log("카카오 geocoder 결과:", result, status);
            if (status === window.kakao.maps.services.Status.OK) {
              const addr =
                result[0].road_address
                  ? result[0].road_address.address_name
                  : result[0].address.address_name;
              setAddress(addr);
            } else {
              setAddress("주소를 찾을 수 없습니다.");
            }
          });
        }
      },
      (err) => {
        let msg = "";
        if (err.code === 1) msg = "위치 권한이 거부되었습니다.";
        else if (err.code === 2) msg = "위치 정보를 사용할 수 없습니다.";
        else if (err.code === 3) msg = "위치 정보 요청이 시간 초과되었습니다.";
        else msg = "알 수 없는 위치 오류입니다.";
        setGeoError(msg);
        setAddress(msg);
      }
    );
  }, []);

  // 네이버맵, 카카오맵 바로가기 링크
  const mapLinks = position
    ? (
      <>
        <div style={{ fontSize: "0.8em", marginTop: 3 }}>
          <a href={`https://map.kakao.com/link/map/${position.lat},${position.lng}`} target="_blank" rel="noopener noreferrer">
            [카카오맵 위치 보기]
          </a>
          {" | "}
          <a href={`https://map.naver.com/p/search/${position.lat},${position.lng}`} target="_blank" rel="noopener noreferrer">
            [네이버맵 위치 보기]
          </a>
        </div>
        <div style={{ fontSize: "0.8em", color: "#777" }}>
          (lat: {position.lat}, lng: {position.lng})
        </div>
      </>
    )
    : null;

  return (
    <div className="call-bg" style={{ padding: "10px" }}>
      <button className="call-back-btn" onClick={() => navigate(-1)}>
        ←
      </button>

      {/* 지도 */}
      <div
        style={{
          height: "250px",
          width: "100%",
          marginTop: "20px",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        }}
      >
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
        {!position && <p>위치 정보를 불러오는 중입니다...</p>}
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
        {geoError && (
          <div style={{ color: "red", marginTop: "8px" }}>
            <b>({geoError})</b>
          </div>
        )}
        {mapLinks}
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
