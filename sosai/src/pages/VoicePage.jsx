import React, { useState, useRef } from "react";
import NavBar from "../components/NavBar";
import "./VoicePage.css";
import { Mic } from "lucide-react";

export default function VoicePage() {
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState("");       // 음성 인식 결과
  const [response, setResponse] = useState("");   // 서버의 응답 멘트
  const [audioUrl, setAudioUrl] = useState(null); // 오디오 URL, 초기 null로
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
      sendToServer(transcript); // 서버로 전송
    };

    recognition.start();
  };

  // FastAPI 서버에 음성 결과 전송
  const sendToServer = async (keyword) => {
    console.log(">> fetch 준비: ", keyword);
    try {
      setResponse("AI 응답을 기다리는 중...");
      setAudioUrl(null);
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

      // 오디오 URL: IP 기준으로 세팅 (audio_url은 'static/xxx.mp3' 형태)
      const mp3url = `http://localhost:8000/${data.audio_url}`;
      setAudioUrl(mp3url);
      console.log("audioUrl:", mp3url);

      setTimeout(() => {
        audioRef.current?.play();
      }, 300);
    } catch (err) {
      setResponse("서버와 연결할 수 없습니다. " + err.message);
      setAudioUrl(null);
      console.log("fetch error:", err);
    }
  };

  return (
    <div className="voice-bg">
      <div className="voice-header">Let us SOSAI</div>

      <div className="voice-mic">
        <Mic size={90} strokeWidth={2.2} />
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
        <button className="voice-btn outline" disabled={listening}>
          텍스트로 요청하기
        </button>
      </div>

      {result && (
        <div className="voice-result">인식 결과: <b>{result}</b></div>
      )}

      <div className="voice-response">
        {response && (
          <>
            <b>AI 응답:</b> {response}
          </>
        )}

        {/* audioUrl이 있을 때만 렌더링 */}
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
