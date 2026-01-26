"use client";
import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function ExamManager() {
  const [examId, setExamId] = useState("2026-03"); 
  const [subjectInfo, setSubjectInfo] = useState({
    grade: "고1",
    subjectName: "국어",
    isEnglishSkippedListening: false,
    answerString: "",        
    scoreString: "",         
    subjectiveQNums: "",
    categoryString: "", // [NEW] 통합과학용 카테고리 입력
  });

  // [수정] 학년에 따른 과목 목록 동적 생성
  const getSubjectOptions = () => {
    if (subjectInfo.grade === "고3") {
      return [
        "화법과 작문", "언어와 매체", // 국어 선택
        "확률과 통계", "미적분", "기하", // 수학 선택
        "영어"
      ];
    }
    return ["국어", "수학", "영어", "통합과학"]; // 고1, 고2
  };

  // [복구] 문항 수 계산
  const getQuestionCount = () => {
    const str = subjectInfo.answerString.trim();
    if (!str) return 0;
    if (str.includes(',')) {
      return str.split(',').filter(s => s.trim() !== '').length;
    } else {
      return str.replace(/\s/g, '').length;
    }
  };

  // [복구] 배점 개수 계산
  const getScoreCount = () => {
    const str = subjectInfo.scoreString.trim();
    if (!str) return 0;
    if (str.includes(',')) {
      return str.split(',').filter(s => s.trim() !== '').length;
    } else {
      return str.replace(/\s/g, '').length;
    }
  };

  const handleCreateSubject = async () => {
    try {
      // 1. 정답 파싱
      const rawAnswer = subjectInfo.answerString.trim();
      let answers: number[] = [];
      if (rawAnswer.includes(',')) {
        answers = rawAnswer.split(',').filter(s=>s.trim()!=='').map(s => Number(s.trim()));
      } else {
        answers = rawAnswer.replace(/\s/g, '').split('').map(Number);
      }
      const qCount = answers.length;
      
      // 2. 배점 파싱
      const rawScore = subjectInfo.scoreString.trim();
      let scores: number[] = [];
      if (!rawScore) {
        scores = Array(qCount).fill(4);
      } else if (rawScore.includes(',')) {
        scores = rawScore.split(',').filter(s => s.trim() !== '').map(s => Number(s.trim()));
      } else {
        scores = rawScore.replace(/\s/g, '').split('').map(Number);
      }

      // 3. 시작 번호
      let startNum = 1;
      if (subjectInfo.subjectName === "영어" && subjectInfo.isEnglishSkippedListening) {
        startNum = 18;
      }

      // 4. 서술형 처리
      const isSubjectiveArr = Array(qCount).fill(false);
      if (subjectInfo.subjectiveQNums.trim()) {
        const subjectiveNums = subjectInfo.subjectiveQNums.split(',').map(n => Number(n.trim()));
        subjectiveNums.forEach(qNum => {
          const idx = qNum - startNum;
          if (idx >= 0 && idx < qCount) isSubjectiveArr[idx] = true;
        });
      }

      // 5. [NEW] 통합과학 카테고리 파싱
      let categories: string[] = [];
      if (subjectInfo.subjectName === '통합과학') {
        const rawCat = subjectInfo.categoryString.trim();
        if (rawCat) {
          categories = rawCat.includes(',') 
            ? rawCat.split(',').map(s => s.trim()) 
            : rawCat.split('');
        } else {
          categories = Array(qCount).fill('공통');
        }

        if (categories.length !== qCount) {
           if(!confirm(`카테고리 개수(${categories.length})가 문항 수(${qCount})와 다릅니다. 뒷부분은 '공통'으로 채울까요?`)) return;
           while(categories.length < qCount) categories.push('공통');
           categories = categories.slice(0, qCount);
        }
      }

      // 6. DB 저장
      const docId = `${subjectInfo.grade}_${subjectInfo.subjectName}`;
      const payload = {
        grade: subjectInfo.grade,
        subjectName: subjectInfo.subjectName,
        type: subjectInfo.subjectName === "통합과학" ? "integrated_science" : "simple",
        answerKey: answers,
        scoreWeights: scores,
        questionCount: qCount,
        startQuestionNumber: startNum,
        isSubjective: isSubjectiveArr, 
        categories: categories
      };

      await setDoc(doc(db, "exams", examId, "subjects", docId), payload);
      
      await setDoc(doc(db, "exams", examId), {
        id: examId,
        isActive: true,
        year: parseInt(examId.split('-')[0]),
        month: parseInt(examId.split('-')[1]),
        title: `${examId.replace('-', '년 ')}월 월례고사`
      }, { merge: true });

      alert(`[${subjectInfo.subjectName}] 저장 완료! (총 ${qCount}문제)`);
      
    } catch (e) {
      console.error(e);
      alert("오류 발생: " + e);
    }
  };

  // [복구] 렌더링에 필요한 변수 계산
  const qCount = getQuestionCount();
  const sCount = getScoreCount();
  const isCountMismatch = subjectInfo.scoreString.trim() !== "" && qCount !== sCount;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <h1 className="text-2xl font-bold mb-6">월례고사 출제 관리자</h1>
      
      <div className="mb-4">
        <label className="block font-bold mb-1">시험 회차 (ID)</label>
        <input 
          value={examId} onChange={e => setExamId(e.target.value)} 
          className="w-full border p-2 rounded" placeholder="2026-03"
        />
      </div>

      <hr className="my-6"/>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block font-bold mb-1">학년</label>
          <select 
            className="w-full border p-2 rounded"
            value={subjectInfo.grade}
            onChange={e => {
              const newGrade = e.target.value;
              // 학년 변경 시 과목명 초기화 (고3 <-> 고1/2 전환 시 목록이 달라지므로)
              const defaultSubject = newGrade === "고3" ? "화법과 작문" : "국어";
              setSubjectInfo({...subjectInfo, grade: newGrade, subjectName: defaultSubject});
            }}
          >
            <option value="고1">고1</option>
            <option value="고2">고2</option>
            <option value="고3">고3</option>
          </select>
        </div>
        <div>
          <label className="block font-bold mb-1">과목</label>
          <select 
            className="w-full border p-2 rounded"
            value={subjectInfo.subjectName}
            onChange={e => setSubjectInfo({...subjectInfo, subjectName: e.target.value})}
          >
            {getSubjectOptions().map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
      </div>

      {subjectInfo.subjectName === "영어" && (
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={subjectInfo.isEnglishSkippedListening}
              onChange={e => setSubjectInfo({...subjectInfo, isEnglishSkippedListening: e.target.checked})}
              className="w-5 h-5"
            />
            <span className="font-bold text-red-500">영어 듣기 생략 (18번부터 시작)</span>
          </label>
        </div>
      )}

      {/* 정답 입력부 */}
      <div className="mb-4">
        <div className="flex justify-between items-end mb-1">
          <label className="block font-bold">정답 입력</label>
          <span className="text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded text-sm">
            문항 수: {qCount}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-2">
          객관식(12345)은 연속 입력. 서술형(67)은 <strong>쉼표(,)</strong>로 구분.
        </p>
        <input 
          className="w-full border p-2 rounded font-mono tracking-widest" 
          placeholder="예: 12345, 67"
          value={subjectInfo.answerString}
          onChange={e => setSubjectInfo({...subjectInfo, answerString: e.target.value})}
        />
      </div>

      {/* 배점 입력부 */}
      <div className="mb-4">
        <div className="flex justify-between items-end mb-1">
          <label className="block font-bold">배점 입력 (연속 입력 가능)</label>
          <span className={`font-bold px-2 py-1 rounded text-sm ${isCountMismatch ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
            배점 개수: {sCount} {isCountMismatch && "(불일치!)"}
          </span>
        </div>
        <input 
          className="w-full border p-2 rounded font-mono tracking-widest" 
          placeholder="예: 34343"
          value={subjectInfo.scoreString}
          onChange={e => setSubjectInfo({...subjectInfo, scoreString: e.target.value})}
        />
      </div>

      {/* [수정] 통합과학 카테고리 입력은 '고3'이 아닐 때만 보이도록 조건 추가 */}
      {subjectInfo.subjectName === "통합과학" && subjectInfo.grade !== "고3" && (
        <div className="mb-4 bg-green-50 p-4 rounded border border-green-200">
          <label className="block font-bold mb-1 text-green-800">과학 카테고리 입력</label>
          <p className="text-sm text-green-700 mb-2">
            각 문항에 해당하는 과목을 순서대로 입력하세요. (물리, 화학, 생명, 지구)<br/>
            예시: 물,물,화,화,생,생...
          </p>
          <input 
            className="w-full border p-2 rounded font-mono" 
            placeholder="물,화,생,지"
            value={subjectInfo.categoryString}
            onChange={e => setSubjectInfo({...subjectInfo, categoryString: e.target.value})}
          />
        </div>
      )}

      <div className="mb-6 bg-yellow-50 p-4 rounded border border-yellow-200">
        <label className="block font-bold mb-1 text-yellow-800">서술형(주관식) 문항 번호</label>
        <p className="text-sm text-yellow-700 mb-2">입력한 번호는 OMR 대신 숫자 입력창이 뜹니다.</p>
        <input 
          className="w-full border p-2 rounded" 
          placeholder="예: 22, 23"
          value={subjectInfo.subjectiveQNums}
          onChange={e => setSubjectInfo({...subjectInfo, subjectiveQNums: e.target.value})}
        />
      </div>

      <button 
        onClick={handleCreateSubject} 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition"
      >
        과목 생성 / 수정하기
      </button>
    </div>
  );
}