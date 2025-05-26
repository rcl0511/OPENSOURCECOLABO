import React, { useState } from "react";
import NavBar from "../components/NavBar";
import "./MedicalPage.css";

export default function Medical() {
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem("myMedical");
    return saved
      ? JSON.parse(saved)
      : {
          name: "",
          gender: "",
          birth: "",
          blood: "",
          allergies: "",
          medications: "",
          emergency: "",
        };
  });
  const [editing, setEditing] = useState(false);

  // 입력값 변경
  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 저장
  const onSave = () => {
    localStorage.setItem("myMedical", JSON.stringify(form));
    setEditing(false);
    alert("내 정보가 저장되었습니다!");
  };

  // 수정 모드 진입
  const startEdit = () => setEditing(true);

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
                성별
                <input
                  name="gender"
                  value={form.gender}
                  onChange={onChange}
                  placeholder="남/여"
                  maxLength={2}
                  autoComplete="off"
                />
              </label>
              <label>
                생년월일
                <input
                  name="birth"
                  value={form.birth}
                  onChange={onChange}
                  placeholder="YYYY-MM-DD"
                  maxLength={10}
                  autoComplete="off"
                />
              </label>
              <label>
                혈액형
                <input
                  name="blood"
                  value={form.blood}
                  onChange={onChange}
                  maxLength={3}
                  placeholder="A, B, AB, O"
                />
              </label>
              <label>
                알레르기
                <input
                  name="allergies"
                  value={form.allergies}
                  onChange={onChange}
                  placeholder="없음"
                />
              </label>
              <label>
                복용약
                <input
                  name="medications"
                  value={form.medications}
                  onChange={onChange}
                  placeholder="없음"
                />
              </label>
              <label>
                응급 시 주의사항
                <input
                  name="emergency"
                  value={form.emergency}
                  onChange={onChange}
                  placeholder="없음"
                />
              </label>
              <button className="medical-btn" type="submit">
                저장
              </button>
              <button
                className="medical-btn outline"
                type="button"
                onClick={() => setEditing(false)}
                style={{ marginLeft: 10 }}
              >
                취소
              </button>
            </form>
          ) : (
            <div className="medical-info">
              <div>
                <b>이름:</b> {form.name || <span className="medical-null">미입력</span>}
              </div>
              <div>
                <b>성별:</b> {form.gender || <span className="medical-null">미입력</span>}
              </div>
              <div>
                <b>생년월일:</b> {form.birth || <span className="medical-null">미입력</span>}
              </div>
              <div>
                <b>혈액형:</b> {form.blood || <span className="medical-null">미입력</span>}
              </div>
              <div>
                <b>알레르기:</b> {form.allergies || <span className="medical-null">없음</span>}
              </div>
              <div>
                <b>복용약:</b> {form.medications || <span className="medical-null">없음</span>}
              </div>
              <div>
                <b>응급 시 주의사항:</b> {form.emergency || <span className="medical-null">없음</span>}
              </div>
              <button className="medical-btn outline" style={{ marginTop: 18 }} onClick={startEdit}>
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
