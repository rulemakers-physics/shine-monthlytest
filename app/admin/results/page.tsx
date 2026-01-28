"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';

// 학년 및 과목 목록 (Page.tsx와 동일하게 유지)
const GRADES = ['고1', '고2', '고3'];
const SUBJECTS_BY_GRADE: Record<string, string[]> = {
  '고1': ['국어', '수학', '영어', '통합과학'],
  '고2': ['국어', '수학', '영어', '통합과학'],
  '고3': ['화법과 작문', '언어와 매체', '확률과 통계', '미적분', '기하', '영어']
};

export default function ResultManagementPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 수정 모달 상태
  const [editingLog, setEditingLog] = useState<any>(null);
  const [newGrade, setNewGrade] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newExamId, setNewExamId] = useState("");

  // 1. 데이터 로딩 (최근 100건만 조회)
  const fetchData = async () => {
    setLoading(true);
    try {
      // 성적 데이터
      const q = query(collection(db, "testResults"), orderBy("createdAt", "desc"), limit(100));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(list);

      // 시험 회차 정보
      const examSnap = await getDocs(collection(db, "exams"));
      const examList = examSnap.docs.map(doc => doc.data());
      setExams(examList);
    } catch (e) {
      console.error(e);
      alert("데이터 로딩 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. 삭제 핸들러
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`정말 ${name} 학생의 기록을 삭제하시겠습니까? (복구 불가)`)) return;
    try {
      await deleteDoc(doc(db, "testResults", id));
      alert("삭제되었습니다.");
      setLogs(prev => prev.filter(log => log.id !== id));
    } catch (e) {
      alert("삭제 오류 발생");
    }
  };

  // 3. 수정 모달 열기
  const openEditModal = (log: any) => {
    setEditingLog(log);
    // 현재 log의 과목 정보를 기반으로 학년 추론 (ID가 "고1_국어" 형식이므로 split)
    const currentGrade = log.subjectId.split('_')[0] || "고1";
    setNewGrade(currentGrade);
    setNewSubject(log.subjectName);
    setNewExamId(log.examId);
  };

  // 4. 재채점 및 수정 요청
  const handleUpdate = async () => {
    if (!newExamId || !newGrade || !newSubject) return;
    if (!confirm(`[주의] ${editingLog.studentName} 학생의 성적을\n'${newGrade} ${newSubject}' 시험지로 변경하고 재채점하시겠습니까?`)) return;

    try {
      const res = await fetch('/api/admin/regrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultId: editingLog.id,
          newExamId: newExamId,
          newGrade: newGrade,
          newSubjectName: newSubject
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        alert(data.message);
        setEditingLog(null); // 모달 닫기
        fetchData(); // 목록 새로고침
      } else {
        alert("오류: " + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("서버 통신 오류");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🛠️ 성적 데이터 통합 관리</h1>
        <button onClick={fetchData} className="bg-gray-100 px-4 py-2 rounded text-sm font-bold hover:bg-gray-200">
          🔄 새로고침
        </button>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-bold uppercase border-b">
            <tr>
              <th className="p-4">시간</th>
              <th className="p-4">회차</th>
              <th className="p-4">학생 (번호)</th>
              <th className="p-4">과목</th>
              <th className="p-4 text-right">점수</th>
              <th className="p-4 text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="p-10 text-center">로딩 중...</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition">
                <td className="p-4 text-gray-500 text-xs">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="p-4 text-xs font-mono text-gray-500">{log.examId}</td>
                <td className="p-4 font-bold">
                  {log.studentName} <span className="text-gray-400 font-normal">({log.studentNumber})</span>
                </td>
                <td className="p-4 text-blue-700 font-semibold">
                  {/* subjectId에서 학년 추출하여 표시 (예: 고1_국어 -> 고1 국어) */}
                  {log.subjectId.replace('_', ' ')}
                </td>
                <td className="p-4 text-right font-bold text-gray-800">{log.totalScore}점</td>
                <td className="p-4 flex justify-center gap-2">
                  <button 
                    onClick={() => openEditModal(log)}
                    className="bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200 font-bold text-xs"
                  >
                    수정
                  </button>
                  <button 
                    onClick={() => handleDelete(log.id, log.studentName)}
                    className="bg-red-50 text-red-500 px-3 py-1 rounded hover:bg-red-100 font-bold text-xs"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 수정 모달 */}
      {editingLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">✏️ 성적 정보 수정</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">학생 정보</label>
                <div className="p-2 bg-gray-100 rounded text-gray-700">
                  {editingLog.studentName} ({editingLog.studentNumber})
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">시험 회차 변경</label>
                <select 
                  className="w-full border p-2 rounded"
                  value={newExamId}
                  onChange={e => setNewExamId(e.target.value)}
                >
                  {exams.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">학년 변경</label>
                  <select 
                    className="w-full border p-2 rounded"
                    value={newGrade}
                    onChange={e => {
                      setNewGrade(e.target.value);
                      setNewSubject(SUBJECTS_BY_GRADE[e.target.value][0]); // 과목 초기화
                    }}
                  >
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">과목 변경</label>
                  <select 
                    className="w-full border p-2 rounded"
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                  >
                    {(SUBJECTS_BY_GRADE[newGrade] || []).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-700">
                ⚠️ <strong>주의:</strong> 변경 시 선택한 학년/과목의 정답지로 <strong>자동 재채점</strong>됩니다. 기존 입력된 답안(OMR)은 유지됩니다.
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button 
                onClick={() => setEditingLog(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button 
                onClick={handleUpdate}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
              >
                변경 및 재채점
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}