import React, { useState, useRef } from "react";
import NavBar from "../components/NavBar";
import "./VoicePage.css";

export default function VoicePage() {
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState("");       // 음성 인식 결과
  const [response, setResponse] = useState("");   // 서버의 응답 멘트
  const [audioUrl, setAudioUrl] = useState("");   // 서버의 mp3 url
  const [showInputBox, setShowInputBox] = useState(false);
  const [textInput, setTextInput] = useState("");
  const audioRef = useRef(null);

  const handleStart = () => {
    console.log("음성인식 버튼 클릭됨");
    if (!("webkitSpeechRecognition" in window)) {
      alert("브라우저가 음성인식을 지원하지 않습니다.");
      return;
    }
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setResult("");     // 이전 결과 초기화
    setResponse("");   // 응답도 초기화
    let gotResult = false;  // 인식 여부

    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      if (!gotResult) {
        setResponse("음성을 인식하지 못했어요. 다시 말씀해 주세요.");
      }
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      gotResult = true;
      setResult(transcript);
      sendToServer(transcript); // 서버로 전송
    };

    recognition.start();
  };

  const handleTextInput = () => {
    setShowInputBox(true);
    setTextInput("");
  };

  const submitTextInput = () => {
    if (textInput.trim() === "") return;
    setResult(textInput);
    sendToServer(textInput);
    setShowInputBox(false);
  };

  // FastAPI 서버에 음성 결과 전송
  const sendToServer = async (keyword) => {
    console.log(">> fetch 준비: ", keyword);
    try {
      setResponse("AI 응답을 기다리는 중...");
      setAudioUrl("");
      const res = await fetch("http://localhost:8000/dialog", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ keyword }),
});
      console.log(">> fetch 응답: ", res);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setResponse(data.text);
      //const mp3url = `http://127.0.0.1:8000/${data.audio_url}`;
      const mp3url = `http://192.168.219.119:8000/${data.audio_url}`;
// 오디오 태그 src={audioUrl}에 세팅!

      setAudioUrl(mp3url);
      console.log("audioUrl:", mp3url);
      setTimeout(() => {
        audioRef.current?.play();
      }, 300);
    } catch (err) {
      setResponse("서버와 연결할 수 없습니다. " + err.message);
      setAudioUrl("");
      console.log("fetch error:", err);
    }
  };

  return (
    <div className="voice-bg">
      <div className="voice-header">Let us SOSAI</div>
      <div className="voice-mic">
        <span role="img" aria-label="마이크" style={{ fontSize: 90 }}>
          🎤
        </span>
      </div>
      <div className="voice-guide">
        <b>
          현재 상황을 말씀해 주세요.<br />
          상황에 맞는 대처방법을 알려드리겠습니다
        </b>
      </div>
      <div className="voice-btn-row">
        <button
          className="voice-btn main"
          onClick={handleStart}
          disabled={listening}
        >
          {listening ? "듣는 중..." : "음성으로 요청하기"}
        </button>
        <button
          className="voice-btn outline"
          onClick={handleTextInput}
          disabled={listening}
        >
          텍스트로 요청하기
        </button>
      </div>
      {showInputBox && (
        <div className="text-input-row">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="상황을 입력해 주세요."
            className="text-input-field"
          />
          <button
            onClick={submitTextInput}
            className="text-submit-btn"
          >
            전송
          </button>
        </div>
      )}

      {result && (
        <div className="voice-result">인식 결과: <b>{result}</b></div>
      )}
      <div className="voice-response">
        {response && (
          <>
            <b>AI 응답:</b> {response}
          </>
        )}
        {/* 항상 오디오 태그를 렌더링해서 audioUrl을 바로 확인할 수 있게! */}
        <audio
          ref={audioRef}
          src={audioUrl}
          controls
          autoPlay
          style={{ marginTop: 8, width: "100%" }}
          onError={() => alert("오디오 재생에 실패했습니다!")}
        >
          브라우저가 오디오 태그를 지원하지 않습니다.
        </audio>
        <div style={{ color: "blue", fontSize: 12 }}>
          audioUrl: {audioUrl}
        </div>
      </div>

      <NavBar active="home" />
    </div>
  );
}
