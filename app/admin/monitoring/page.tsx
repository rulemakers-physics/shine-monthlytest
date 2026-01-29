"use client";
import { useState, useEffect } from 'react';

export default function MonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [dupStudents, setDupStudents] = useState<any[][]>([]);
  const [dupResults, setDupResults] = useState<any[][]>([]);
  const [mixedGrades, setMixedGrades] = useState<any[]>([]);
  const [splitCases, setSplitCases] = useState<any[]>([]); // [NEW] 분산 계정 데이터

  const fetchData = async () => {
    setLoading(true);
    try {
      const resDup = await fetch('/api/admin/duplicates');
      const dataDup = await resDup.json();
      setDupStudents(dataDup.duplicateStudents || []);
      setDupResults(dataDup.duplicateResults || []);

      const resMix = await fetch('/api/admin/anomalies');
      const dataMix = await resMix.json();
      setMixedGrades(dataMix.mixedGradeCases || []);
      setSplitCases(dataMix.splitScoreCases || []); // [NEW]

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

  // [NEW] 병합 핸들러
  const handleMerge = async (targetId: string, sourceIds: string[], studentName: string) => {
    if (!confirm(`[중요] ${studentName} 학생의 모든 성적을\n첫 번째 계정(${targetId})으로 통합하고,\n나머지 중복 계정을 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch('/api/admin/merge-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStudentId: targetId,
          sourceStudentIds: sourceIds
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchData();
      } else {
        alert("오류: " + data.error);
      }
    } catch (e) {
      alert("서버 오류");
    }
  };

  // 삭제 핸들러 (기존)
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
        fetchData();
      } else {
        alert("삭제 실패");
      }
    } catch (e) { alert("오류 발생"); }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 pb-20">
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
          
          {/* [NEW] 0. 최악의 케이스: 계정 분산 및 점수 분리 */}
          <section className="bg-red-50 p-6 rounded-2xl shadow-sm border border-red-200">
            <h2 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
              🆘 계정 분산 & 성적 분리 감지 ({splitCases.length}건)
              {splitCases.length === 0 && <span className="text-green-600 text-sm font-normal ml-2">✅ 이상 없음</span>}
            </h2>
            <p className="text-xs text-red-600 mb-4">
              * 동일 학생이 2개 이상의 계정으로 나뉘어 있고, 성적도 각기 다른 계정에 입력된 <strong>가장 심각한 케이스</strong>입니다.<br/>
              * [병합 실행]을 누르면 모든 성적을 <strong>가장 오래된(첫 번째) 계정</strong>으로 옮기고 나머지는 삭제합니다.
            </p>

            {splitCases.length > 0 && (
              <div className="space-y-4">
                {splitCases.map((group, idx) => {
                  // 생성일 순으로 정렬 (가장 오래된 계정을 살림)
                  const accounts = group.accounts.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                  const primaryAccount = accounts[0];
                  const secondaryAccounts = accounts.slice(1);
                  const secondaryIds = secondaryAccounts.map((s: any) => s.id);

                  return (
                    <div key={idx} className="bg-white border border-red-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-red-100 px-4 py-3 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-red-900 mr-2">
                            {group.studentName} ({group.studentNumber})
                          </span>
                          <span className="text-xs text-red-700">
                            계정 {accounts.length}개 발견 / {group.splitExams.length}개 시험 분산됨
                          </span>
                        </div>
                        <button 
                          onClick={() => handleMerge(primaryAccount.id, secondaryIds, group.studentName)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-700 shadow transition"
                        >
                          ⚡ 계정 및 성적 병합 실행
                        </button>
                      </div>
                      
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-red-50/30">
                        {/* 계정별 성적 현황 표시 */}
                        {accounts.map((acc: any, i: number) => {
                          const accResults = group.details.filter((d: any) => d.studentId === acc.id);
                          return (
                            <div key={acc.id} className={`p-3 rounded-lg border ${i === 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                              <div className="flex justify-between mb-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${i === 0 ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'}`}>
                                  {i === 0 ? "메인 계정 (유지됨)" : "중복 계정 (삭제 예정)"}
                                </span>
                                <span className="text-xs text-gray-400 font-mono">{acc.id}</span>
                              </div>
                              {accResults.length > 0 ? (
                                <ul className="space-y-1">
                                  {accResults.map((res: any) => (
                                    <li key={res.id} className="text-sm flex justify-between">
                                      <span className="text-gray-700 font-medium">{res.subject}</span>
                                      <span className="text-gray-500">{res.examId} ({res.score}점)</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-xs text-gray-400 py-2 text-center">성적 데이터 없음</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 1. 학년 혼재 섹션 (기존 유지) */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
            <h2 className="text-lg font-bold text-orange-600 mb-4 flex items-center gap-2">
              ⚠️ 학년 혼재 의심 ({mixedGrades.length}건)
              {mixedGrades.length === 0 && <span className="text-green-500 text-sm font-normal ml-2">✅ 이상 없음</span>}
            </h2>
            {/* ... (이전 코드와 동일, 생략 없이 유지해주세요) ... */}
            {mixedGrades.length > 0 && (
              <div className="space-y-4">
                {mixedGrades.map((group, idx) => (
                  <div key={idx} className="border border-orange-200 rounded-xl overflow-hidden">
                    <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-orange-800 mr-2">
                          {group.studentName} ({group.studentNumber})
                        </span>
                        <span className="text-xs text-orange-600 bg-white px-2 py-0.5 rounded border border-orange-200">
                          {group.examId}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-orange-500">
                        발견된 학년: {group.grades.join(', ')}
                      </span>
                    </div>
                    
                    <div className="divide-y divide-gray-100">
                      {group.details.map((item: any, i: number) => (
                        <div key={i} className="p-4 flex justify-between items-center bg-white hover:bg-gray-50">
                          <div className="flex items-center gap-4">
                            <span className={`text-sm font-bold px-2 py-1 rounded ${item.grade === '고3' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {item.grade}
                            </span>
                            <span className="text-gray-700 font-medium">{item.subject}</span>
                            <span className="text-gray-400 text-xs">({item.score}점)</span>
                          </div>
                          <button 
                            onClick={() => handleDelete('testResults', item.docId, '잘못된 학년 성적')}
                            className="text-gray-400 hover:text-red-600 px-3 py-1.5 rounded text-xs border border-gray-200 hover:border-red-200 transition"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 2. 성적 중복 섹션 (기존 유지) */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            {/* ... (이전 성적 중복 섹션 코드 유지) ... */}
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              📑 성적 중복 의심 ({dupResults.length}건)
              {dupResults.length === 0 && <span className="text-green-500 text-sm font-normal ml-2">✅ 이상 없음</span>}
            </h2>
            {dupResults.length > 0 && (
              <div className="space-y-4">
                {dupResults.map((group, idx) => (
                  <div key={idx} className="border rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                      <span className="text-gray-800 font-bold text-sm">
                        중복 그룹 #{idx + 1}: {group[0].studentName} ({group[0].studentNumber}) - {group[0].subjectName}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {group.map((item: any, i: number) => (
                        <div key={item.id} className="p-4 flex justify-between items-center bg-white hover:bg-gray-50">
                          <div className="text-sm">
                            <span className="block font-bold text-gray-700">
                              {i === 0 ? "🆕 최신 데이터" : `🕒 과거 데이터`}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {new Date(item.createdAt).toLocaleString()} | <span className="font-bold text-blue-600">{item.totalScore}점</span>
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

          {/* 3. 학생 정보 중복 섹션 (단순 중복) */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 opacity-60 hover:opacity-100 transition">
            <h2 className="text-lg font-bold text-gray-500 mb-4 flex items-center gap-2">
              👤 단순 학생 정보 중복 ({dupStudents.length}건)
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              * 성적이 꼬이지 않은 단순 중복 계정입니다. 위 "계정 분산" 섹션에 해당하지 않는 경우만 여기에 표시됩니다.
            </p>
            {/* ... (이전 학생 중복 섹션 코드 유지) ... */}
            {dupStudents.length > 0 && (
              <div className="space-y-4">
                {dupStudents.map((group, idx) => (
                  <div key={idx} className="border rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <span className="text-gray-700 font-bold text-sm">
                        {group[0].name} ({group[0].studentNumber})
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {group.map((item: any) => (
                        <div key={item.id} className="p-4 flex justify-between items-center bg-white">
                          <div className="text-sm text-gray-500">
                            ID: {item.id} <br/>
                            가입: {new Date(item.createdAt).toLocaleString()}
                          </div>
                          <button 
                            onClick={() => handleDelete('students', item.id, '학생 정보')}
                            className="text-red-400 hover:text-red-600 text-xs underline"
                          >
                            삭제
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