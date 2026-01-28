"use client";
import { useState, useEffect } from 'react';

export default function MonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [dupStudents, setDupStudents] = useState<any[][]>([]);
  const [dupResults, setDupResults] = useState<any[][]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/duplicates');
      const data = await res.json();
      setDupStudents(data.duplicateStudents || []);
      setDupResults(data.duplicateResults || []);
    } catch (e) {
      console.error(e);
      alert("데이터 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (collectionName: string, docId: string, description: string) => {
    if (!confirm(`[주의] 선택한 ${description} 데이터를 영구 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch('/api/admin/duplicates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionName, docId })
      });
      
      if (res.ok) {
        alert("삭제되었습니다.");
        fetchData(); // 목록 새로고침
      } else {
        alert("삭제 실패");
      }
    } catch (e) {
      alert("오류 발생");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">🔍 데이터 이상 탐지 및 모니터링</h1>
        <button onClick={fetchData} className="bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 shadow-sm">
          🔄 새로고침
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">데이터 스캔 중...</div>
      ) : (
        <div className="space-y-10">
          
          {/* 1. 성적 중복 섹션 */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              📑 성적 중복 의심 ({dupResults.length}건)
              {dupResults.length === 0 && <span className="text-green-500 text-sm font-normal ml-2">✅ 이상 없음</span>}
            </h2>
            
            {dupResults.length > 0 && (
              <div className="space-y-4">
                {dupResults.map((group, idx) => (
                  <div key={idx} className="border rounded-xl overflow-hidden">
                    <div className="bg-orange-50 px-4 py-2 border-b border-orange-100 flex justify-between items-center">
                      <span className="text-orange-800 font-bold text-sm">
                        ⚠️ 중복 그룹 #{idx + 1}: {group[0].studentName} ({group[0].studentNumber}) - {group[0].subjectName}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {group.map((item: any, i: number) => (
                        <div key={item.id} className="p-4 flex justify-between items-center bg-white hover:bg-gray-50">
                          <div className="text-sm">
                            <span className="block font-bold text-gray-700">
                              {i === 0 ? "🆕 최신 데이터 (유지 권장)" : `🕒 과거 데이터 ${i}`}
                            </span>
                            <span className="text-gray-500 text-xs">
                              생성일: {new Date(item.createdAt).toLocaleString()} <br/>
                              점수: <span className="font-bold text-blue-600">{item.totalScore}점</span> (답안: {item.answers.join(', ')})
                            </span>
                          </div>
                          <button 
                            onClick={() => handleDelete('testResults', item.id, '성적')}
                            className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded text-xs font-bold border border-red-200"
                          >
                            삭제하기
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 2. 학생 정보 중복 섹션 */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              👤 학생 정보 중복 ({dupStudents.length}건)
              {dupStudents.length === 0 && <span className="text-green-500 text-sm font-normal ml-2">✅ 이상 없음</span>}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              * 동일한 이름과 학생 번호가 2번 이상 등록된 경우입니다. (성적 데이터가 연결되어 있을 수 있으니 주의하세요)
            </p>

            {dupStudents.length > 0 && (
              <div className="space-y-4">
                {dupStudents.map((group, idx) => (
                  <div key={idx} className="border rounded-xl overflow-hidden">
                    <div className="bg-blue-50 px-4 py-2 border-b border-blue-100">
                      <span className="text-blue-800 font-bold text-sm">
                        ⚠️ 중복 그룹 #{idx + 1}: {group[0].name} ({group[0].studentNumber})
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {group.map((item: any) => (
                        <div key={item.id} className="p-4 flex justify-between items-center bg-white">
                          <div className="text-sm text-gray-600">
                            ID: <span className="font-mono text-xs bg-gray-100 px-1 rounded">{item.id}</span> <br/>
                            가입일: {new Date(item.createdAt).toLocaleString()}
                          </div>
                          <button 
                            onClick={() => handleDelete('students', item.id, '학생 정보')}
                            className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded text-xs font-bold border border-red-200"
                          >
                            삭제하기
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      )}
    </div>
  );
}