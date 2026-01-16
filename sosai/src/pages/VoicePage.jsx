import React, { useState, useRef } from "react";
import NavBar from "../components/NavBar";
import "./VoicePage.css";
import { Mic } from "lucide-react";

export default function VoicePage() {
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState("");
  const [response, setResponse] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [showInputBox, setShowInputBox] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [similarQuestions, setSimilarQuestions] = useState([]);
  const audioRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [prediction, setPrediction] = useState(""); // label or index
  const [topk, setTopk] = useState([]);

  // ✅ 운영에서는 반드시 HTTPS BASE URL을 넣어야 Mixed Content 안 막힘
  // 예: REACT_APP_API_BASE_URL=https://api.yourdomain.com
  const BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

  const predictionLabel = {
    0: "1도 화상",
    1: "2도 화상",
    2: "심각한 화상 - 응급처치 필요",
    "1도": "1도 화상",
    "2도": "2도 화상",
    "3도": "심각한 화상 - 응급처치 필요",
  };

  const predictionSolution = {
    0: ` [1도 화상 응급처치]
- 시원한 물로 10~15분간 화상 부위를 흐르게 하여 냉각시키세요.
- 얼음을 직접 대지 마세요. 오히려 피부 조직을 손상시킬 수 있습니다.
- 화상 부위를 깨끗한 수건이나 거즈로 감싸고, 감염을 방지하기 위해 항생 연고를 발라줍니다.
- 통증이 심하거나 수포가 생기면 반드시 병원 진료를 받으세요.
- 햇빛에 노출되지 않도록 보호하고, 의류는 헐렁하게 입으세요.`,
    1: ` [2도 화상 응급처치]
- 흐르는 시원한 물에 최소 15분 이상 식히세요.
- 물집이 생겨도 절대 터뜨리지 마세요. 감염 위험이 매우 큽니다.
- 화상 부위를 깨끗한 거즈나 천으로 가볍게 감싸 보호하세요.
- 진통제(예: 아세트아미노펜, 이부프로펜 등)를 복용하여 통증을 완화할 수 있습니다.
- 반드시 병원을 방문하여 감염 예방 및 적절한 드레싱 치료를 받으세요.
- 넓은 부위일 경우 탈수 방지를 위해 수분 섭취를 충분히 하세요.`,
    2: `🆘 [심각한 화상 - 3도 이상]
- 즉시 119에 신고하세요. 생명에 위험이 있을 수 있는 응급상황입니다.
- 화상 부위를 흐르는 찬물로 식히되, 얼음은 절대 직접 대지 마세요.
- 타버린 옷이 붙어 있어도 억지로 떼지 마세요.
- 멸균 거즈나 깨끗한 천으로 화상 부위를 부드럽게 덮되, 압박하지 마세요.
- 호흡 곤란, 의식 혼미, 피부 창백 등의 증상이 나타나면 즉시 CPR 준비를 하며 구급대 도착을 기다리세요.
- 전신 화상이나 얼굴, 기도, 생식기, 손발 등에 화상이 있으면 반드시 병원에서 집중치료가 필요합니다.`,
    "1도": ` [1도 화상 응급처치]
- 시원한 물로 10~15분간 화상 부위를 흐르게 하여 냉각시키세요.
- 얼음을 직접 대지 마세요. 오히려 피부 조직을 손상시킬 수 있습니다.
- 화상 부위를 깨끗한 수건이나 거즈로 감싸고, 감염을 방지하기 위해 항생 연고를 발라줍니다.
- 통증이 심하거나 수포가 생기면 반드시 병원 진료를 받으세요.
- 햇빛에 노출되지 않도록 보호하고, 의류는 헐렁하게 입으세요.`,
    "2도": ` [2도 화상 응급처치]
- 흐르는 시원한 물에 최소 15분 이상 식히세요.
- 물집이 생겨도 절대 터뜨리지 마세요. 감염 위험이 매우 큽니다.
- 화상 부위를 깨끗한 거즈나 천으로 가볍게 감싸 보호하세요.
- 진통제(예: 아세트아미노펜, 이부프로펜 등)를 복용하여 통증을 완화할 수 있습니다.
- 반드시 병원을 방문하여 감염 예방 및 적절한 드레싱 치료를 받으세요.
- 넓은 부위일 경우 탈수 방지를 위해 수분 섭취를 충분히 하세요.`,
    "3도": `🆘 [심각한 화상 - 3도 이상]
- 즉시 119에 신고하세요. 생명에 위험이 있을 수 있는 응급상황입니다.
- 화상 부위를 흐르는 찬물로 식히되, 얼음은 절대 직접 대지 마세요.
- 타버린 옷이 붙어 있어도 억지로 떼지 마세요.
- 멸균 거즈나 깨끗한 천으로 화상 부위를 부드럽게 덮되, 압박하지 마세요.
- 호흡 곤란, 의식 혼미, 피부 창백 등의 증상이 나타나면 즉시 CPR 준비를 하며 구급대 도착을 기다리세요.
- 전신 화상이나 얼굴, 기도, 생식기, 손발 등에 화상이 있으면 반드시 병원에서 집중치료가 필요합니다.`,
  };

  const playAudio = (url) => {
    setAudioUrl(url);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.playbackRate = 1.25;
        audioRef.current.play().catch(() => {});
      }
    }, 300);
  };

  const handleStart = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("브라우저가 음성인식을 지원하지 않습니다.");
      return;
    }

    setSelectedImage(null);
    setPrediction("");
    setTopk([]);
    setResponse("");
    setAudioUrl("");
    setSimilarQuestions([]);

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

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedImage(URL.createObjectURL(file));
    setPrediction("AI 예측 중...");
    setTopk([]);
    setResponse("");
    setAudioUrl("");
    setSimilarQuestions([]);
    setResult("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BASE_URL}/predict-image`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      // ✅ 백엔드 응답: { ok, result:{label,confidence,index}, topk:[...] }
      const best = data?.result;
      setPrediction(best?.label ?? best?.index ?? "");
      setTopk(Array.isArray(data?.topk) ? data.topk : []);

      // (선택) 이미지 예측은 텍스트 답변/오디오가 자동 생성되지 않으니 여기선 안 돌림
      setResponse("");
      setSimilarQuestions([]);
      setAudioUrl("");
    } catch (err) {
      setPrediction("❌ 서버 오류: " + err.message);
      setTopk([]);
      setResponse("");
      setAudioUrl("");
      setSimilarQuestions([]);
    }
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

  // ✅ /answer로 질문 보내고, 결과(best_answer) 받아온 뒤 /tts로 mp3 생성
  const sendTextToServer = async (keyword) => {
    try {
      setResponse("AI 응답을 기다리는 중...");
      setAudioUrl("");
      setSimilarQuestions([]);
      setPrediction("");
      setTopk([]);
      setSelectedImage(null);

      // 1) QnA 답변
      const res = await fetch(`${BASE_URL}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: keyword, top_k: 3 }),
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();

      const bestAnswer = data?.best_answer || "";
      setResponse(bestAnswer);

      // 유사 질문은 서버에서 원문 질문이 없으니, index/score로 표시(원하면 백엔드에서 질문 컬럼을 같이 보내도록 개선 가능)
      const results = Array.isArray(data?.results) ? data.results : [];
      setSimilarQuestions(
        results.map((r) => ({
          question: `유사 항목 #${r.index}`,
          similarity: r.score,
        }))
      );

      // 2) TTS 생성 (응답 텍스트가 있을 때만)
      if (bestAnswer && bestAnswer.trim().length > 0) {
        const ttsRes = await fetch(`${BASE_URL}/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: bestAnswer, lang: "ko" }),
        });

        if (!ttsRes.ok) throw new Error(`TTS HTTP error! status: ${ttsRes.status}`);
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
      setSimilarQuestions([]);
    }
  };

  const predictionText = predictionLabel[prediction] || prediction;
  const solutionText = predictionSolution[prediction] || "대처 방법을 찾을 수 없습니다.";

  return (
    <div className="voice-bg">
      <div className="voice-header">Let us SOSAI</div>

      <div className="voice-mic" onClick={handleStart} style={{ cursor: "pointer" }}>
        <Mic size={90} strokeWidth={2.2} color={listening ? "#888" : "#305078"} />
      </div>

      <div className="voice-guide">
        <b>
          현재 상황을 말씀해 주세요.
          <br />
          상황에 맞는 대처방법을<br /> 알려드리겠습니다
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

        <button className="voice-btn outline" onClick={handleTextInputClick} disabled={listening}>
          텍스트로 요청하기
        </button>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          id="cameraInput"
          style={{ display: "none" }}
          onChange={handleImageChange}
        />
        <input
          type="file"
          accept="image/*"
          id="galleryInput"
          style={{ display: "none" }}
          onChange={handleImageChange}
        />
      </div>

      {showInputBox && (
        <div className="text-input-row">
          <input
            type="text"
            className="text-input-field"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="상황을 입력해 주세요."
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

        {similarQuestions.length > 0 && (
          <div className="similar-questions">
            <b>💡 유사한 항목:</b>
            <ul>
              {similarQuestions.map((item, idx) => (
                <li key={idx}>
                  {item.question}{" "}
                  <span style={{ color: "#999", fontSize: 12 }}>
                    ({(item.similarity * 100).toFixed(1)}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {audioUrl && audioUrl !== "" && (
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

        {/* 이미지 예측 결과 */}
        {selectedImage && prediction !== "" && (
          <div className="result-section">
            <div className="image-preview">
              <img src={selectedImage} alt="선택된 이미지" />
            </div>

            <div className="prediction-result">
              예측 결과: {predictionText}
              <div className="solution-text">{solutionText}</div>

              {topk.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 13, color: "#555" }}>
                  <b>Top-3:</b>
                  <ul style={{ marginTop: 6 }}>
                    {topk.map((t, i) => (
                      <li key={i}>
                        {t.label} ({(Number(t.confidence) * 100).toFixed(1)}%)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
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
