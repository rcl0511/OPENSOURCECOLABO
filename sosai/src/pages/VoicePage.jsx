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
  const [similarQuestions, setSimilarQuestions] = useState([]); // ✅ 유사질문 상태 추가
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
    console.log(">> fetch 준비: ", keyword);
    try {
      setResponse("AI 응답을 기다리는 중...");
      setAudioUrl(null);
      setSimilarQuestions([]); // 초기화
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
      setSimilarQuestions(data.top_similar_questions || []); // ✅ 유사질문 저장

      const mp3url = `http://localhost:8000${data.audio_url}`;
      setAudioUrl(mp3url);
      console.log("audioUrl:", mp3url);

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
    <div className="voice-bg">
      <div className="voice-header">Let us SOSkin</div>

      <div className="voice-mic" onClick={handleStart} style={{ cursor: "pointer" }}>
        <Mic size={90} strokeWidth={2.2} color={listening ? "#888" : "#305078"} />
      </div>

      <div className="voice-guide">
        <b>
          현재 상황을 말씀해 주세요.<br />
          상황에 맞는 대처방법을 알려드리겠습니다
        </b>
      </div>

      <div className="voice-btn-group">
        <button
          className="voice-btn main"
          onClick={handleStart}
          disabled={listening}
          style={{ background: listening ? "#ddd" : "#305078" }}
        >
          {listening ? "듣는 중..." : "음성인식"}
        </button>
        <button
          className="voice-btn outline"
          onClick={handleTextInputClick}
          disabled={listening}
        >
          텍스트로 요청하기
        </button>
      </div>

      {showInputBox && (
        <div className="text-input-row" style={{ marginTop: 12 }}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="상황을 입력해 주세요."
            style={{
              padding: "8px",
              fontSize: "16px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              width: "70%",
              marginRight: "8px",
            }}
          />
          <button
            onClick={handleTextSubmit}
            style={{
              padding: "8px 16px",
              fontSize: "16px",
              backgroundColor: "#305078",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
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

        {/* ✅ 유사 질문 리스트 출력 */}
        {similarQuestions.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 14 }}>
            <b>💡 유사한 질문:</b>
            <ul style={{ marginTop: 4, paddingLeft: 16 }}>
              {similarQuestions.map((item, idx) => (
                <li key={idx}>
                  {item.question} <span style={{ color: "#999", fontSize: 12 }}>({(item.similarity * 100).toFixed(1)}%)</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {audioUrl && (
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
        )}

        {audioUrl && (
          <div style={{ color: "blue", fontSize: 12 }}>
            audioUrl: {audioUrl}
          </div>
        )}
      </div>

      <NavBar active="home" />
    </div>
  );
}
