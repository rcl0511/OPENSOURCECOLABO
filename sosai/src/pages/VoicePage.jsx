import React, { useState, useRef } from "react";
import NavBar from "../components/NavBar";
import "./VoicePage.css";
import { Mic } from "lucide-react";

export default function VoicePage() {
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState("");
  const [response, setResponse] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [showInputBox, setShowInputBox] = useState(false);
  const [textInput, setTextInput] = useState("");
  const audioRef = useRef(null);

  const handleStart = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("브라우저가 음성인식을 지원하지 않습니다.");
      return;
    }
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setResult(transcript);
      sendToServer(transcript);
    };

    recognition.start();
  };

  const handleTextInputClick = () => {
    setShowInputBox(true);
    setTextInput("");
  };

  const handleTextSubmit = () => {
    if (textInput.trim() === "") return;
    setResult(textInput);
    sendToServer(textInput);
    setShowInputBox(false);
  };

  const sendToServer = async (keyword) => {
    try {
      setResponse("AI 응답을 기다리는 중...");
      setAudioUrl(null);
      const res = await fetch("http://localhost:8000/dialog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setResponse(data.text);
      const mp3url = `http://localhost:8000/${data.audio_url}`;
      setAudioUrl(mp3url);

      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.playbackRate = 1.25;
          audioRef.current.play();
        }
      }, 300);
    } catch (err) {
      setResponse("서버와 연결할 수 없습니다. " + err.message);
      setAudioUrl(null);
      console.log("fetch error:", err);
    }
  };

  return (
    <div className="voice-bg" style={{ padding: "30px", fontSize: "20px" }}>
      <div className="voice-header" style={{ fontSize: "36px", fontWeight: "bold", marginBottom: "24px" }}>
        Let us SOSAI
      </div>

      <div
        className="voice-mic"
        onClick={handleStart}
        style={{ cursor: "pointer", marginBottom: "20px" }}
        title="마이크 클릭으로 음성 인식 시작"
      >
        <Mic size={120} strokeWidth={2.5} color={listening ? "#888" : "#305078"} />
      </div>

      <div className="voice-guide" style={{ fontSize: "24px", marginBottom: "24px", textAlign: "center" }}>
        <b>
          현재 상황을 말씀해 주세요.<br />
          상황에 맞는 대처방법을 알려드리겠습니다
        </b>
      </div>

      <div className="voice-btn-group" style={{ marginBottom: "24px", gap: "16px" }}>
        <button
          className="voice-btn main"
          onClick={handleStart}
          disabled={listening}
          style={{
            background: listening ? "#ddd" : "#305078",
            color: "#fff",
            padding: "16px 32px",
            fontSize: "20px",
            border: "none",
            borderRadius: "12px",
            marginRight: "12px",
            cursor: "pointer",
          }}
        >
          {listening ? "듣는 중..." : "음성인식"}
        </button>
        <button
          className="voice-btn outline"
          onClick={handleTextInputClick}
          disabled={listening}
          style={{
            backgroundColor: "#fff",
            color: "#305078",
            padding: "16px 32px",
            fontSize: "20px",
            border: "2px solid #305078",
            borderRadius: "12px",
            cursor: "pointer",
          }}
        >
          텍스트로 요청하기
        </button>
      </div>

      {showInputBox && (
        <div className="text-input-row" style={{ marginTop: 16 }}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="상황을 입력해 주세요."
            style={{
              padding: "14px",
              fontSize: "18px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              width: "60%",
              marginRight: "12px",
            }}
          />
          <button
            onClick={handleTextSubmit}
            style={{
              padding: "14px 24px",
              fontSize: "18px",
              backgroundColor: "#305078",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            전송
          </button>
        </div>
      )}

{result && (
  <div className="voice-result" style={{ fontSize: "24px", marginTop: "24px" }}>
    인식 결과: <b>{result}</b>
  </div>
)}

<div className="voice-response" style={{ fontSize: "24px", marginTop: "24px" }}>
  {response && (
    <>
      <b>AI 응답:</b> {response}
    </>
  )}


        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            autoPlay
            style={{ marginTop: 16, width: "100%" }}
            onError={() => alert("오디오 재생에 실패했습니다!")}
          >
            브라우저가 오디오 태그를 지원하지 않습니다.
          </audio>
        )}

        {audioUrl && (
          <div style={{ color: "blue", fontSize: 14, marginTop: 8 }}>
            audioUrl: {audioUrl}
          </div>
        )}
      </div>

      <NavBar active="home" />
    </div>
  );
}
