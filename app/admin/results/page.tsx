"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, deleteDoc, query, orderBy, limit, startAfter, where } from 'firebase/firestore';

// 학년 및 과목 목록
const GRADES = ['고1', '고2', '고3'];
const SUBJECTS_BY_GRADE: Record<string, string[]> = {
  '고1': ['국어', '수학', '영어', '통합과학'],
  '고2': ['국어', '수학', '영어', '통합과학'],
  '고3': ['화법과 작문', '언어와 매체', '확률과 통계', '미적분', '기하', '영어']
};

const ITEMS_PER_PAGE = 50; // 한 번에 불러올 데이터 수

export default function ResultManagementPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false); // 더 보기 로딩 상태
  
  // 페이지네이션 상태
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);

  // 검색어 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false); // 현재 검색 모드인지 여부

  // 수정 모달 상태
  const [editingLog, setEditingLog] = useState<any>(null);
  const [newGrade, setNewGrade] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newExamId, setNewExamId] = useState("");

  // 1. 초기 데이터 로딩
  const fetchData = async () => {
    setLoading(true);
    setIsSearching(false); // 검색 모드 해제
    try {
      // 최신순으로 끊어서 가져오기
      const q = query(
        collection(db, "testResults"), 
        orderBy("createdAt", "desc"), 
        limit(ITEMS_PER_PAGE)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setLogs(list);
      setLastDoc(snap.docs[snap.docs.length - 1]); // 마지막 문서 저장 (커서)
      setHasMore(snap.docs.length === ITEMS_PER_PAGE); // 가져온 개수가 limit과 같으면 더 있을 수 있음

      // 시험 회차 정보 로딩 (최초 1회)
      if (exams.length === 0) {
        const examSnap = await getDocs(collection(db, "exams"));
        const examList = examSnap.docs.map(doc => doc.data());
        setExams(examList);
      }
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

  // [NEW] 더 보기 핸들러 (페이지네이션)
  const handleLoadMore = async () => {
    if (!lastDoc || isSearching) return;
    
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "testResults"), 
        orderBy("createdAt", "desc"), 
        startAfter(lastDoc), // 마지막 문서 다음부터 조회
        limit(ITEMS_PER_PAGE)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setLogs(prev => [...prev, ...list]); // 기존 리스트에 추가
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === ITEMS_PER_PAGE);
    } catch (e) {
      console.error(e);
      alert("추가 데이터 로딩 중 오류가 발생했습니다.");
    } finally {
      setLoadingMore(false);
    }
  };

  // 2. 검색 핸들러 (검색은 필터링을 위해 전체 조회 또는 별도 인덱싱 활용)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      fetchData(); // 검색어 없으면 초기화
      return;
    }

    setLoading(true);
    setIsSearching(true); // 검색 모드 활성화 (더 보기 비활성화)
    
    try {
      const resultsRef = collection(db, "testResults");
      let q;

      // 숫자인 경우 학생 번호로, 문자인 경우 이름으로 검색
      if (/^\d+$/.test(searchTerm)) {
        q = query(resultsRef, where("studentNumber", "==", searchTerm));
      } else {
        q = query(resultsRef, where("studentName", "==", searchTerm));
      }

      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 검색 결과는 클라이언트에서 최신순 정렬
      list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setLogs(list);
      setHasMore(false); // 검색 결과는 페이징 처리하지 않음 (전체 로딩)
    } catch (e) {
      console.error(e);
      alert("검색 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 3. 삭제 핸들러
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

  // 4. 수정 모달 열기
  const openEditModal = (log: any) => {
    setEditingLog(log);
    const currentGrade = log.subjectId.split('_')[0] || "고1";
    setNewGrade(currentGrade);
    setNewSubject(log.subjectName);
    setNewExamId(log.examId);
  };

  // 5. 재채점 및 수정 요청
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
        setEditingLog(null);
        // 현재 뷰 갱신 (검색 중이면 재검색, 아니면 새로고침)
        if (isSearching) {
          const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
          handleSearch(fakeEvent);
        } else {
          fetchData();
        }
      } else {
        alert("오류: " + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("서버 통신 오류");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">🛠️ 성적 데이터 통합 관리</h1>
        
        {/* 검색창 영역 */}
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="이름 또는 번호 검색" 
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700">
            검색
          </button>
          <button 
            type="button" 
            onClick={() => { setSearchTerm(""); fetchData(); }} 
            className="bg-gray-100 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200"
          >
            초기화
          </button>
        </form>
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
              <tr><td colSpan={6} className="p-10 text-center text-gray-500">로딩 중...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="p-10 text-center text-gray-400">데이터가 없습니다.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition">
                  <td className="p-4 text-gray-500 text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 text-xs font-mono text-gray-500">{log.examId}</td>
                  <td className="p-4 font-bold">
                    {log.studentName} <span className="text-gray-400 font-normal">({log.studentNumber})</span>
                  </td>
                  <td className="p-4 text-blue-700 font-semibold">
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
              ))
            )}
          </tbody>
        </table>
        
        {/* 더 보기 버튼 영역 */}
        {!isSearching && hasMore && (
          <div className="p-4 text-center border-t border-gray-100 bg-gray-50">
            <button 
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-gray-500 font-bold text-sm hover:text-blue-600 transition flex items-center justify-center gap-2 mx-auto disabled:text-gray-300"
            >
              {loadingMore ? '로딩 중...' : '👇 더 보기'}
            </button>
          </div>
        )}
      </div>

      {/* 수정 모달 (기존 코드와 동일) */}
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
                      setNewSubject(SUBJECTS_BY_GRADE[e.target.value][0]); 
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