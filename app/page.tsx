"use client";
import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import styles from './Page.module.css'; 
import ResultModal from './components/ResultModal';
import Link from 'next/link';

// [추가] 학년별 표시할 과목 목록 정의
const SUBJECTS_BY_GRADE: Record<string, string[]> = {
  '고1': ['국어', '수학', '영어', '통합과학'],
  '고2': ['국어', '수학', '영어', '통합과학'],
  '고3': ['화법과 작문', '언어와 매체', '확률과 통계', '미적분', '기하', '영어']
};

export default function Home() {
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  
  const [studentInfo, setStudentInfo] = useState({ name: "", number: "" });
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(""); 
  
  const [subjectConfig, setSubjectConfig] = useState<any>(null); 
  const [answers, setAnswers] = useState<number[]>([]); 
  
  const [showModal, setShowModal] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

  // Tab키 이동 등 자연스러운 포커싱을 위한 Refs
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const fetchExams = async () => {
      const snap = await getDocs(collection(db, "exams"));
      const list = snap.docs.map(d => d.data()).sort((a:any, b:any) => b.id.localeCompare(a.id));
      setExams(list);
      if(list.length > 0) setSelectedExamId(list[0].id);
    };
    fetchExams();
  }, []);

  const handleSubjectSelect = async (grade: string, subjectName: string) => {
    setSelectedGrade(grade);
    const docId = `${grade}_${subjectName}`; 
    const docRef = doc(db, "exams", selectedExamId, "subjects", docId);
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
      const data = snap.data();
      setSubjectConfig(data);
      setSelectedSubject(docId);
      setAnswers(Array(data.questionCount).fill(0));
      // Refs 배열 초기화
      inputRefs.current = inputRefs.current.slice(0, data.questionCount);
    } else {
      alert("해당 학년/과목의 시험지가 아직 등록되지 않았습니다.");
      setSubjectConfig(null);
    }
  };

  const handleInputChange = (index: number, valueStr: string) => {
    const isSubjective = subjectConfig?.isSubjective?.[index];
    
    // 1. 공란 처리 -> 0 (미응답)
    if (valueStr === "") {
      const newAns = [...answers];
      newAns[index] = 0;
      setAnswers(newAns);
      return;
    }

    // 2. 숫자만 허용
    const numVal = Number(valueStr);
    if (isNaN(numVal)) return;

    // 3. 범위 제한
    if (isSubjective) {
      // 서술형: 0 ~ 999
      if (numVal < 0 || numVal > 999) return;
    } else {
      // 객관식: 1 ~ 5 (한 자리수만 입력되도록 처리)
      const lastChar = valueStr.slice(-1);
      const digit = Number(lastChar);
      if (digit < 1 || digit > 5) return;
      
      const newAns = [...answers];
      newAns[index] = digit;
      setAnswers(newAns);
      return;
    }

    // 서술형 저장
    const newAns = [...answers];
    newAns[index] = numVal;
    setAnswers(newAns);
  };

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
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* 1. 헤더 & 로고 영역 */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-white rounded-full shadow-md mb-2">
            {/* 로고 이미지 */}
            <img src="/favicon.ico" alt="Shine Logo" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            <span className="text-blue-600">샤인 독서실</span> 월례고사
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            OMR 카드를 작성하듯 답안을 입력해주세요. (숫자키 + Tab)
          </p>
        </header>
        
        {/* 2. 학생 정보 및 시험 선택 (카드 디자인) */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 rounded-lg p-1 text-xl">👤</span>
            응시자 정보
          </h2>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">시험 회차</label>
              <select 
                value={selectedExamId} 
                onChange={e => setSelectedExamId(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              >
                {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">이름</label>
              <input 
                value={studentInfo.name} 
                onChange={e => setStudentInfo({...studentInfo, name: e.target.value})}
                placeholder="예: 홍길동"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition placeholder-gray-400"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-semibold text-gray-600">학생 번호 (8자리)</label>
              <input 
                value={studentInfo.number} 
                onChange={e => setStudentInfo({...studentInfo, number: e.target.value})}
                placeholder="예: 12345678"
                maxLength={8}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition placeholder-gray-400 font-mono tracking-widest"
              />
            </div>
          </div>
        </section>

        {/* 3. 과목 선택 탭 (세련된 버튼 스타일) */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="bg-green-100 text-green-600 rounded-lg p-1 text-xl">📚</span>
            과목 선택
          </h2>

          <div className="space-y-6">
            {/* 학년 탭 */}
            <div className="flex p-1 bg-gray-100 rounded-xl">
              {['고1', '고2', '고3'].map(g => (
                <button 
                  key={g} 
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${
                    selectedGrade === g 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setSelectedGrade(g)}
                >
                  {g}
                </button>
              ))}
            </div>

            {/* 과목 버튼 - 수정됨: 동적 목록 렌더링 */}
            {selectedGrade && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(SUBJECTS_BY_GRADE[selectedGrade] || []).map(sub => (
                  <button 
                    key={sub}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all duration-200 ${
                      selectedSubject.includes(sub)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                    onClick={() => handleSubjectSelect(selectedGrade, sub)}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 4. OMR 답안 입력 (그리드 스타일 개선) */}
        {subjectConfig && (
          <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-bold text-gray-800">
                📝 {subjectConfig.grade} {subjectConfig.subjectName} 답안 입력
              </h2>
              <span className="text-xs text-gray-500 font-mono bg-white px-2 py-1 rounded border">
                총 {subjectConfig.questionCount}문항
              </span>
            </div>
            
            <div className="p-6 sm:p-8">
              <div className={styles.omrGrid}>
                {answers.map((ans, idx) => {
                  const qNum = idx + subjectConfig.startQuestionNumber;
                  const isSubjective = subjectConfig.isSubjective?.[idx] || false;

                  return (
                    <div 
                      key={idx} 
                      className={`
                        relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200
                        ${isSubjective ? 'bg-yellow-50 border-yellow-100 hover:border-yellow-300' : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-md'}
                      `}
                    >
                      <span className={`absolute top-2 left-3 text-xs font-bold ${isSubjective ? 'text-yellow-700' : 'text-gray-400'}`}>
                        {qNum}
                      </span>
                      
                      <div className="mt-4 w-full">
                        <input
                          ref={el => { inputRefs.current[idx] = el }}
                          type="text" 
                          inputMode="numeric"
                          className={`
                            w-full text-center font-bold text-xl bg-transparent outline-none p-1 border-b-2 
                            ${ans ? 'border-blue-500 text-blue-600' : 'border-gray-200 text-gray-800'}
                            focus:border-blue-600 transition-colors
                          `}
                          placeholder={isSubjective ? "입력" : "-"}
                          value={ans === 0 ? '' : ans}
                          onChange={(e) => handleInputChange(idx, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          autoComplete="off"
                        />
                      </div>
                      
                      <span className="text-[10px] text-gray-400 mt-1 h-3">
                        {isSubjective ? '주관식' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-lg flex items-center justify-center gap-2"
                  onClick={handleSubmit}
                >
                  <span>채점 완료 및 제출</span>
                  <span className="text-blue-200">🚀</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="text-center py-8">
          <Link href="/admin/exam-manager" className="text-gray-400 text-xs hover:text-gray-600 transition underline">
            관리자 설정
          </Link>
        </div>

        {/* 결과 모달 */}
        {showModal && resultData && (
          <ResultModal result={resultData} onClose={() => setShowModal(false)} />
        )}
      </div>
    </main>
  );
}