"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase'; 
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import styles from './Page.module.css'; // 기존 스타일 재사용
import ResultModal from './components/ResultModal';
import Link from 'next/link';

// (타입 정의는 위에서 만든 lib/types.ts import 사용 권장)

export default function Home() {
  // 1. 상태 관리
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  
  const [studentInfo, setStudentInfo] = useState({ name: "", number: "" }); // 이름, 번호 입력
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(""); // subjectId (예: high1_math)
  
  const [subjectConfig, setSubjectConfig] = useState<any>(null); // DB에서 불러온 과목 정보
  const [answers, setAnswers] = useState<number[]>([]); // 학생 답안
  
  const [showModal, setShowModal] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

  // 2. 초기 로딩: 시험 회차 목록 불러오기
  useEffect(() => {
    const fetchExams = async () => {
      const snap = await getDocs(collection(db, "exams"));
      const list = snap.docs.map(d => d.data()).sort((a:any, b:any) => b.id.localeCompare(a.id));
      setExams(list);
      if(list.length > 0) setSelectedExamId(list[0].id);
    };
    fetchExams();
  }, []);

  // 3. 과목 선택 시 DB에서 설정 불러오기
  const handleSubjectSelect = async (grade: string, subjectName: string) => {
    setSelectedGrade(grade);
    // 통합과학과 국영수는 ID 규칙이 다를 수 있으나 여기선 규칙 통일 가정
    const docId = `${grade}_${subjectName}`; 
    
    // DB 조회
    const docRef = doc(db, "exams", selectedExamId, "subjects", docId);
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
      const data = snap.data();
      setSubjectConfig(data);
      setSelectedSubject(docId);
      // 답안 배열 0으로 초기화
      setAnswers(Array(data.questionCount).fill(0));
    } else {
      alert("해당 학년/과목의 시험지가 아직 등록되지 않았습니다.");
      setSubjectConfig(null);
    }
  };

  // 4. 답안 변경 핸들러 (객관식/주관식 통합)
  const handleAnswerChange = (index: number, value: number) => {
    const newAns = [...answers];
    newAns[index] = value;
    setAnswers(newAns);
  };

  // 5. 제출 핸들러
  const handleSubmit = async () => {
    if(!studentInfo.name || !studentInfo.number || studentInfo.number.length !== 8) {
      alert("이름과 학생번호(8자리)를 정확히 입력해주세요.");
      return;
    }
    
    const res = await fetch('/api/submit-test', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        examId: selectedExamId,
        subjectId: selectedSubject,
        studentName: studentInfo.name,
        studentNumber: studentInfo.number,
        answers: answers,
      })
    });
    
    const data = await res.json();
    setResultData(data);
    setShowModal(true);
  };

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>샤인 독서실 월례고사 채점 시스템</h1>
      
      {/* 1. 시험 선택 & 학생 정보 */}
      <section className={styles.infoSection}>
        <div className={styles.inputGroup}>
          <label>시험 회차</label>
          <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
            {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
          </select>
        </div>
        <div className={styles.inputGroup}>
          <label>이름</label>
          <input 
            value={studentInfo.name} 
            onChange={e => setStudentInfo({...studentInfo, name: e.target.value})}
            placeholder="홍길동"
          />
        </div>
        <div className={styles.inputGroup}>
          <label>학생번호 (8자리)</label>
          <input 
            value={studentInfo.number} 
            onChange={e => setStudentInfo({...studentInfo, number: e.target.value})}
            placeholder="12345678"
            maxLength={8}
          />
        </div>
      </section>

      {/* 2. 과목 선택 탭 */}
      <section className={styles.selectionSection}>
        <div className={styles.gradeTabs}>
          {['고1', '고2', '고3'].map(g => (
            <button 
              key={g} 
              className={selectedGrade === g ? styles.activeTab : styles.tab}
              onClick={() => setSelectedGrade(g)}
            >
              {g}
            </button>
          ))}
        </div>
        {selectedGrade && (
          <div className={styles.subjectButtons}>
            {['국어', '수학', '영어', '통합과학'].map(sub => (
              <button 
                key={sub}
                className={selectedSubject.includes(sub) ? styles.activeBtn : styles.btn}
                onClick={() => handleSubjectSelect(selectedGrade, sub)}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 3. OMR 카드 영역 */}
      {subjectConfig && (
        <section className={styles.omrSection}>
          <h2>{subjectConfig.grade} {subjectConfig.subjectName} 답안 입력</h2>
          
          <div className={styles.omrGrid}>
            {answers.map((ans, idx) => {
              const qNum = idx + subjectConfig.startQuestionNumber;
              const isSubjective = subjectConfig.isSubjective?.[idx] || false; // 서술형 체크

              return (
                <div key={idx} className={styles.omrRow}>
                  <span className={styles.qNumBadge}>{qNum}번</span>
                  
                  {isSubjective ? (
                    // [서술형] 숫자 입력 인풋
                    <input 
                      type="number" 
                      className={styles.subjectiveInput}
                      placeholder="답"
                      value={ans === 0 ? '' : ans}
                      onChange={(e) => handleAnswerChange(idx, parseInt(e.target.value) || 0)}
                      max="999"
                    />
                  ) : (
                    // [객관식] 라디오 버튼 1~5
                    <div className={styles.radioGroup}>
                      {[1, 2, 3, 4, 5].map(opt => (
                        <label key={opt} className={styles.radioLabel}>
                          <input 
                            type="radio" 
                            name={`q-${qNum}`}
                            checked={ans === opt}
                            onChange={() => handleAnswerChange(idx, opt)}
                          />
                          <span className={styles.bubble}>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button className={styles.submitBtn} onClick={handleSubmit}>채점하기</button>
        </section>
      )}
      <div className={styles.adminFooter}>
        <Link href="/admin/exam-manager" className={styles.adminLink}>
          ⚙️ 관리자 페이지 (시험 출제 및 설정)
        </Link>
      </div>
      {/* 결과 모달 */}
      {showModal && resultData && (
        <ResultModal result={resultData} onClose={() => setShowModal(false)} />
      )}
    </main>
  );
}