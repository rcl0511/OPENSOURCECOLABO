import React, { useEffect, useState } from "react";
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
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return emptyForm;

      const parsed = JSON.parse(saved);
      // 혹시 예전 키가 섞여 있어도 안전하게 병합
      return { ...emptyForm, ...parsed };
    } catch {
      return emptyForm;
    }
  });

  const [editing, setEditing] = useState(false);

  // 입력값 변경
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // 저장
  const onSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    setEditing(false);
    alert("내 정보가 저장되었습니다!");
  };

  // 수정 모드 진입
  const startEdit = () => setEditing(true);

  // (선택) 편집 취소 시 로컬 저장값으로 되돌리기
  const cancelEdit = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setForm(saved ? { ...emptyForm, ...JSON.parse(saved) } : emptyForm);
    } catch {
      setForm(emptyForm);
    }
    setEditing(false);
  };

  const Null = ({ text = "미입력" }) => <span className="medical-null">{text}</span>;

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
                저장
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
                {form.medical_history ? form.medical_history : <Null text="없음" />}
              </div>
              <div>
                <b>수술 이력:</b>{" "}
                {form.surgery_history ? form.surgery_history : <Null text="없음" />}
              </div>
              <div>
                <b>복용약:</b> {form.medications ? form.medications : <Null text="없음" />}
              </div>
              <div>
                <b>알레르기:</b> {form.allergies ? form.allergies : <Null text="없음" />}
              </div>
              <div>
                <b>응급연락망:</b>{" "}
                {form.emergency_contacts ? form.emergency_contacts : <Null text="없음" />}
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
