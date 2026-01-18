import React, { useState, useRef } from "react";
import NavBar from "../components/NavBar";
import "./VoicePage.css";
import { Mic } from "lucide-react";

/**
 * SOSAI VoicePage (LLM 기반 /dialog 전용)
 * - 이미지/화상 기능 제거
 * - /answer(SBERT) 제거
 * - /dialog 호출 (JWT 있으면 Authorization 헤더 포함)
 * - audio_url 있으면 재생, 없으면 /tts로 생성
 */

export default function VoicePage() {
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState("");
  const [response, setResponse] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [showInputBox, setShowInputBox] = useState(false);
  const [textInput, setTextInput] = useState("");

  const audioRef = useRef(null);

  const BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "https://api.rcl0511.xyz";

  const playAudio = (url) => {
    setAudioUrl(url);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.playbackRate = 1.25;
        audioRef.current.play().catch(() => {});
      }
    }, 250);
  };

  // 토큰 있으면 넣고, 없으면 빈 객체
  const getAuthHeaders = () => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("jwt") ||
      "";

    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleStart = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("브라우저가 음성인식을 지원하지 않습니다.");
      return;
    }

    setResult("");
    setResponse("");
    setAudioUrl("");
    setShowInputBox(false);

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setResult(transcript);
      sendTextToServer(transcript);
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
    sendTextToServer(textInput);
    setShowInputBox(false);
  };

  const sendTextToServer = async (keyword) => {
    try {
      setResponse("AI 응답을 기다리는 중...");
      setAudioUrl("");

      // 1) /dialog 호출
      const res = await fetch(`${BASE_URL}/dialog`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(), // 토큰 있으면만
        },
        body: JSON.stringify({ keyword }),
      });

      if (!res.ok) {
        const text = await res.text();
        if (res.status === 401) {
          throw new Error("로그인이 필요합니다. 로그인 후 다시 시도해 주세요.");
        }
        throw new Error(`HTTP ${res.status} - ${text}`);
      }

      const data = await res.json();
      const answer = data?.answer || data?.text || "";
      setResponse(answer);

      // 2) audio_url이 백엔드에서 오면 바로 재생
      if (data?.audio_url) {
        const mp3url = data.audio_url.startsWith("http")
          ? data.audio_url
          : `${BASE_URL}${data.audio_url}`;
        playAudio(mp3url);
        return;
      }

      // 3) audio_url이 없으면 /tts로 생성해서 재생 (여긴 Authorization 필요 없음)
      if (answer && answer.trim().length > 0) {
        const ttsRes = await fetch(`${BASE_URL}/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: answer, lang: "ko" }),
        });

        if (!ttsRes.ok) {
          const text = await ttsRes.text();
          throw new Error(`TTS HTTP ${ttsRes.status} - ${text}`);
        }

        const ttsData = await ttsRes.json();
        if (ttsData?.url) {
          const mp3url = `${BASE_URL}${ttsData.url}`;
          playAudio(mp3url);
        } else {
          setAudioUrl("");
        }
      }
    } catch (err) {
      setResponse("서버와 연결할 수 없습니다. " + err.message);
      setAudioUrl("");
    }
  };

  return (
    <div className="voice-bg">
      <div className="voice-header">Let us SOSAI</div>

      <div
        className="voice-mic"
        onClick={handleStart}
        style={{ cursor: "pointer" }}
      >
        <Mic
          size={90}
          strokeWidth={2.2}
          color={listening ? "#888" : "#305078"}
        />
      </div>

      <div className="voice-guide">
        <b>
          현재 상황을 말씀해 주세요.
          <br />
          상황에 맞는 대처방법을
          <br /> 알려드리겠습니다
        </b>
      </div>

      <div className="voice-btn-group">
        <button
          className="voice-btn main"
          onClick={handleStart}
          disabled={listening}
          style={{ background: listening ? "#ddd" : "#305078", color: "#fff" }}
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
        <div className="text-input-row">
          <input
            type="text"
            className="text-input-field"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="상황을 입력해 주세요."
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTextSubmit();
            }}
          />
          <button className="text-submit-btn" onClick={handleTextSubmit}>
            전송
          </button>
        </div>
      )}

      {result && (
        <div className="voice-result">
          인식 결과: <b>{result}</b>
        </div>
      )}

      <div className="voice-response">
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
            onError={() => alert("오디오 재생에 실패했습니다!")}
          >
            브라우저가 오디오 태그를 지원하지 않습니다.
          </audio>
        )}
      </div>

      <NavBar active="home" />
    </div>
  );
}
