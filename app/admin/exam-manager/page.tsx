"use client";
import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

export default function ExamManager() {
  const [examId, setExamId] = useState("2026-03"); 
  const [subjectInfo, setSubjectInfo] = useState({
    grade: "고1",
    subjectName: "국어",
    isEnglishSkippedListening: false,
    answerString: "",        
    scoreString: "",         
    subjectiveQNums: "",     
  });

  // 문항 수 계산 (정답)
  const getQuestionCount = () => {
    const str = subjectInfo.answerString.trim();
    if (!str) return 0;
    if (str.includes(',')) {
      return str.split(',').filter(s => s.trim() !== '').length;
    } else {
      return str.replace(/\s/g, '').length;
    }
  };

  // [NEW] 배점 개수 계산
  const getScoreCount = () => {
    const str = subjectInfo.scoreString.trim();
    if (!str) return 0;
    if (str.includes(',')) {
      return str.split(',').filter(s => s.trim() !== '').length;
    } else {
      return str.replace(/\s/g, '').length;
    }
  };

  // 정답 포맷팅 (연속 -> 콤마)
  const formatToComma = () => {
    const current = subjectInfo.answerString;
    if (!current || current.includes(',')) return;
    const formatted = current.split('').join(', ');
    setSubjectInfo({ ...subjectInfo, answerString: formatted });
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
      
      // 2. [수정됨] 배점 파싱 (연속 입력 지원)
      const rawScore = subjectInfo.scoreString.trim();
      let scores: number[] = [];
      
      if (!rawScore) {
        // 미입력 시 기본 4점
        scores = Array(qCount).fill(4);
      } else if (rawScore.includes(',')) {
        // 콤마 모드
        scores = rawScore.split(',').filter(s => s.trim() !== '').map(s => Number(s.trim()));
      } else {
        // [NEW] 연속 입력 모드 (예: 34343)
        scores = rawScore.replace(/\s/g, '').split('').map(Number);
      }

      // 개수 검증 (선택 사항)
      if (rawScore && scores.length !== qCount) {
        if (!confirm(`문항 수(${qCount}개)와 배점 개수(${scores.length}개)가 다릅니다. 그래도 저장할까요?`)) {
          return;
        }
      }

      // 3. 시작 번호 (영어 듣기)
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

      // 5. 통합과학 카테고리 (더미)
      let categories: string[] = [];
      if (subjectInfo.subjectName === '통합과학') {
        categories = Array(qCount).fill('comm'); 
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

  const qCount = getQuestionCount();
  const sCount = getScoreCount();
  const isCountMismatch = subjectInfo.scoreString && qCount !== sCount;

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
            value={subjectInfo.grade} // [수정] value 속성 추가
            onChange={e => setSubjectInfo({...subjectInfo, grade: e.target.value})}
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
            value={subjectInfo.subjectName} // [수정] value 속성 추가
            onChange={e => setSubjectInfo({...subjectInfo, subjectName: e.target.value})}
          >
            <option value="국어">국어</option>
            <option value="수학">수학</option>
            <option value="영어">영어</option>
            <option value="통합과학">통합과학</option>
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
        
        <div className="flex gap-2 mb-2">
           <input 
            className="w-full border p-2 rounded font-mono tracking-widest" 
            placeholder="예: 12345, 67, 100"
            value={subjectInfo.answerString}
            onChange={e => setSubjectInfo({...subjectInfo, answerString: e.target.value})}
          />
          <button 
            onClick={formatToComma}
            className="whitespace-nowrap bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded text-sm font-bold"
            title="연속된 숫자를 쉼표 구분으로 바꿉니다"
          >
            쉼표 변환 🪄
          </button>
        </div>
        <p className="text-sm text-blue-600">
          💡 팁: 객관식(12345) 먼저 입력 후 [쉼표 변환]을 누르고, 뒤에 서술형 정답(, 67, 100)을 적으세요.
        </p>
      </div>

      {/* [수정됨] 배점 입력부 */}
      <div className="mb-4">
        <div className="flex justify-between items-end mb-1">
          <label className="block font-bold">배점 입력 (연속 입력 가능)</label>
          <span className={`font-bold px-2 py-1 rounded text-sm ${isCountMismatch ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
            배점 개수: {sCount} {isCountMismatch && "(불일치!)"}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-2">
          한 자리수라면 연속으로 입력하세요 (예: 34343). 소수점 등은 쉼표 사용.
        </p>
        <input 
          className="w-full border p-2 rounded font-mono tracking-widest" 
          placeholder="예: 343433434"
          value={subjectInfo.scoreString}
          onChange={e => setSubjectInfo({...subjectInfo, scoreString: e.target.value})}
        />
      </div>

      <div className="mb-6 bg-yellow-50 p-4 rounded border border-yellow-200">
        <label className="block font-bold mb-1 text-yellow-800">서술형(주관식) 문항 번호</label>
        <p className="text-sm text-yellow-700 mb-2">입력한 번호는 OMR 대신 숫자 입력창이 뜹니다.</p>
        <input 
          className="w-full border p-2 rounded" 
          placeholder="예: 22, 23, 24"
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