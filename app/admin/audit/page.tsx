"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, deleteDoc, query, orderBy } from 'firebase/firestore';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // 모든 성적 데이터를 가져옵니다 (필요시 where 조건 추가 가능)
      const q = query(collection(db, "testResults"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      // [필터링 핵심] "국어" 과목이면서 "26일"에 생성된 데이터만 추출
      const filtered = list.filter(item => {
        const date = new Date(item.createdAt);
        // 과목이 국어(또는 화작/언매)이고, 날짜가 26일인 경우
        const isKorean = item.subjectName === '국어' || item.subjectName === '화법과 작문' || item.subjectName === '언어와 매체';
        const isTargetDate = date.getDate() === 26; 
        
        return isKorean && isTargetDate;
      });

      setLogs(filtered);
    } catch (e) {
      console.error(e);
      alert("데이터 로딩 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleDelete = async (id: string, studentName: string, score: number) => {
    if (!confirm(`[주의] ${studentName} 학생의 ${score}점 기록을 정말 삭제하시겠습니까?`)) return;
    
    try {
      await deleteDoc(doc(db, "testResults", id));
      alert("삭제되었습니다.");
      // 목록 갱신
      setLogs(prev => prev.filter(log => log.id !== id));
    } catch (e) {
      console.error(e);
      alert("삭제 실패");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-red-600 mb-6">🚨 26일 국어 성적 긴급 점검</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
            <tr>
              <th className="p-4">시간</th>
              <th className="p-4">이름 (번호)</th>
              <th className="p-4">과목</th>
              <th className="p-4 text-right">점수</th>
              <th className="p-4 text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center">데이터 조회 중...</td></tr>
            ) : logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-red-50 transition">
                  <td className="p-4 text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 font-bold">
                    {log.studentName} <span className="text-gray-400 font-normal">({log.studentNumber})</span>
                  </td>
                  <td className="p-4">{log.subjectName}</td>
                  <td className="p-4 text-right font-bold text-blue-600">{log.totalScore}점</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleDelete(log.id, log.studentName, log.totalScore)}
                      className="bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 font-bold text-xs"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">해당 날짜의 국어 성적 데이터가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}