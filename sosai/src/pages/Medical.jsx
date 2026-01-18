import React, { useState, useEffect, useCallback } from "react";
import NavBar from "../components/NavBar";
import "./MedicalPage.css";

const STORAGE_KEY = "myMedical";

const emptyForm = {
  name: "",
  birth_date: "",
  blood_type: "",
  medical_history: "",
  surgery_history: "",
  medications: "",
  allergies: "",
  emergency_contacts: "",
};

export default function Medical() {
  const BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "https://api.rcl0511.xyz";

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ 토큰 헤더 (useCallback으로 고정)
  const getAuthHeaders = useCallback(() => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("jwt") ||
      "";

    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // ✅ 페이지 진입 시 DB에서 내 의료정보 불러오기
  useEffect(() => {
    const load = async () => {
      try {
        const headers = { ...getAuthHeaders() };

        // 로그인 안 했으면 로컬 캐시라도 보여주기
        if (!headers.Authorization) {
          try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) setForm({ ...emptyForm, ...JSON.parse(saved) });
          } catch {}
          return;
        }

        const res = await fetch(`${BASE_URL}/medical`, { headers });

        if (!res.ok) {
          const text = await res.text();
          if (res.status === 401) {
            alert("로그인이 필요합니다. 다시 로그인해 주세요.");
          } else {
            console.error("GET /medical failed:", text);
          }
          return;
        }

        const data = await res.json();

        const merged = { ...emptyForm, ...data };
        delete merged.user_id;
        delete merged.created_at;
        delete merged.updated_at;

        setForm(merged);

        // 로컬 캐시 저장
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [BASE_URL, getAuthHeaders]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ 저장: PUT /medical (DB에 upsert)
  const onSave = async () => {
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      };

      if (!headers.Authorization) {
        alert("로그인이 필요합니다. 로그인 후 다시 저장해 주세요.");
        return;
      }

      const res = await fetch(`${BASE_URL}/medical`, {
        method: "PUT",
        headers,
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const text = await res.text();
        if (res.status === 401) {
          alert("로그인이 만료되었습니다. 다시 로그인해 주세요.");
          return;
        }
        throw new Error(text || `저장 실패 (HTTP ${res.status})`);
      }

      const saved = await res.json();

      const merged = { ...emptyForm, ...saved };
      delete merged.user_id;
      delete merged.created_at;
      delete merged.updated_at;

      setForm(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

      setEditing(false);
      alert("내 의료 정보가 저장되었습니다! (MongoDB 반영 완료)");
    } catch (e) {
      alert("저장 중 오류: " + (e.message || e));
    }
  };

  const startEdit = () => setEditing(true);

  const cancelEdit = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setForm(saved ? { ...emptyForm, ...JSON.parse(saved) } : emptyForm);
    } catch {
      setForm(emptyForm);
    }
    setEditing(false);
  };

  const Null = ({ text = "미입력" }) => (
    <span className="medical-null">{text}</span>
  );

  if (loading) {
    return (
      <div className="medical-bg">
        <div className="medical-content">
          <h2 className="medical-title">내 의료 정보</h2>
          <div className="medical-card" style={{ padding: 20 }}>
            불러오는 중...
          </div>
        </div>
        <NavBar active="medical" />
      </div>
    );
  }

  return (
    <div className="medical-bg">
      <div className="medical-content">
        <h2 className="medical-title">내 의료 정보</h2>

        <div className="medical-card">
          {editing ? (
            <form
              className="medical-form"
              onSubmit={(e) => {
                e.preventDefault();
                onSave();
              }}
            >
              <label>
                이름
                <input
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  required
                  maxLength={12}
                  autoComplete="off"
                  placeholder="이름"
                />
              </label>

              <label>
                생년월일
                <input
                  name="birth_date"
                  value={form.birth_date}
                  onChange={onChange}
                  placeholder="YYYY-MM-DD"
                  maxLength={10}
                  autoComplete="off"
                />
              </label>

              <label>
                혈액형
                <input
                  name="blood_type"
                  value={form.blood_type}
                  onChange={onChange}
                  maxLength={3}
                  placeholder="A, B, AB, O"
                  autoComplete="off"
                />
              </label>

              <label>
                병력(기저질환 포함)
                <input
                  name="medical_history"
                  value={form.medical_history}
                  onChange={onChange}
                  placeholder="예: 고혈압, 당뇨, 천식 등"
                  autoComplete="off"
                />
              </label>

              <label>
                수술 이력
                <input
                  name="surgery_history"
                  value={form.surgery_history}
                  onChange={onChange}
                  placeholder="예: 2020년 맹장 수술"
                  autoComplete="off"
                />
              </label>

              <label>
                복용약
                <input
                  name="medications"
                  value={form.medications}
                  onChange={onChange}
                  placeholder="예: 혈압약(아침 1회)"
                  autoComplete="off"
                />
              </label>

              <label>
                알레르기
                <input
                  name="allergies"
                  value={form.allergies}
                  onChange={onChange}
                  placeholder="예: 페니실린, 땅콩"
                  autoComplete="off"
                />
              </label>

              <label>
                응급연락망
                <input
                  name="emergency_contacts"
                  value={form.emergency_contacts}
                  onChange={onChange}
                  placeholder="예: 엄마 010-xxxx-xxxx"
                  autoComplete="off"
                />
              </label>

              <button className="medical-btn" type="submit">
                저장 (DB 반영)
              </button>

              <button
                className="medical-btn outline"
                type="button"
                onClick={cancelEdit}
                style={{ marginLeft: 10 }}
              >
                취소
              </button>
            </form>
          ) : (
            <div className="medical-info">
              <div>
                <b>이름:</b> {form.name ? form.name : <Null />}
              </div>
              <div>
                <b>생년월일:</b> {form.birth_date ? form.birth_date : <Null />}
              </div>
              <div>
                <b>혈액형:</b> {form.blood_type ? form.blood_type : <Null />}
              </div>
              <div>
                <b>병력(기저질환 포함):</b>{" "}
                {form.medical_history ? (
                  form.medical_history
                ) : (
                  <Null text="없음" />
                )}
              </div>
              <div>
                <b>수술 이력:</b>{" "}
                {form.surgery_history ? (
                  form.surgery_history
                ) : (
                  <Null text="없음" />
                )}
              </div>
              <div>
                <b>복용약:</b>{" "}
                {form.medications ? form.medications : <Null text="없음" />}
              </div>
              <div>
                <b>알레르기:</b>{" "}
                {form.allergies ? form.allergies : <Null text="없음" />}
              </div>
              <div>
                <b>응급연락망:</b>{" "}
                {form.emergency_contacts ? (
                  form.emergency_contacts
                ) : (
                  <Null text="없음" />
                )}
              </div>

              <button
                className="medical-btn outline"
                style={{ marginTop: 18 }}
                onClick={startEdit}
              >
                정보 수정하기
              </button>
            </div>
          )}
        </div>
      </div>

      <NavBar active="medical" />
    </div>
  );
}
