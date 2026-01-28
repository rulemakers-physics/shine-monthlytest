"use client";
import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import ResultModal from '@/app/components/ResultModal';

// [수정] 통합된 과목 색상 정의 (세부 과목 제거)
const COLORS: Record<string, string> = {
  국어: "#ef4444", 
  수학: "#3b82f6", 
  영어: "#f59e0b", 
  통합과학: "#10b981", 
  기타: "#8b5cf6"
};

// [추가] 표시할 과목 순서 정의
const SUBJECT_ORDER = ['국어', '수학', '영어', '통합과학'];

// [추가] 과목명 통합 헬퍼 함수
const normalizeSubject = (subject: string) => {
  if (['화법과 작문', '언어와 매체'].includes(subject)) return '국어';
  if (['확률과 통계', '미적분', '기하'].includes(subject)) return '수학';
  return subject; // 영어, 통합과학 등은 그대로 반환
};

export default function DashboardClient({ studentInfo, results }: { studentInfo: any, results: any[] }) {
  const [selectedResult, setSelectedResult] = useState<any>(null);

  // [수정] 리스트 정렬 로직 (1순위: 최신 시험, 2순위: 국수영탐 순서)
  const sortedResults = [...results].sort((a, b) => {
    // 1. 날짜(최신순) 비교
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    if (dateA !== dateB) return dateB - dateA;

    // 2. 과목 순서 비교
    const subjA = normalizeSubject(a.subjectName);
    const subjB = normalizeSubject(b.subjectName);
    const idxA = SUBJECT_ORDER.indexOf(subjA);
    const idxB = SUBJECT_ORDER.indexOf(subjB);
    
    // 목록에 없는 과목은 맨 뒤로 보냄
    const orderA = idxA === -1 ? 99 : idxA;
    const orderB = idxB === -1 ? 99 : idxB;
    
    return orderA - orderB;
  });

  // 1. 차트용 데이터 가공 (과거 -> 현재 순)
  const chartData = [...sortedResults].reverse().reduce((acc: any[], curr: any) => {
    const label = curr.examId.includes('-') 
      ? `${parseInt(curr.examId.split('-')[1])}월` 
      : curr.examId;
      
    // [수정] 통합된 과목명으로 차트 데이터 생성
    const displaySubject = normalizeSubject(curr.subjectName);

    const existing = acc.find(item => item.name === label);
    if (existing) {
      existing[displaySubject] = curr.totalScore;
    } else {
      acc.push({ name: label, [displaySubject]: curr.totalScore });
    }
    return acc;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎓</span>
            <h1 className="font-bold text-gray-800 text-lg md:text-xl">
              {studentInfo.name} 학생 학습 리포트
            </h1>
          </div>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {studentInfo.number}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        
        {/* 영어 성적 안내 */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">⚠️</div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <span className="font-bold">영어 과목 안내:</span> 영어 성적은 <strong>듣기평가 문항을 제외</strong>하고 산출됩니다. (63점 만점 기준)
              </p>
            </div>
          </div>
        </div>
        
        {/* 1. 종합 성적 추이 그래프 */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            📈 과목별 성적 변화
          </h2>
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  
                  {/* [수정] 정의된 과목 순서(국/수/영/탐)대로 라인 생성 */}
                  {SUBJECT_ORDER.map(sub => (
                    <Line 
                      key={sub}
                      type="monotone" 
                      dataKey={sub} 
                      stroke={COLORS[sub] || COLORS.기타} 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}
                      connectNulls 
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                아직 응시한 시험 데이터가 없습니다.
              </div>
            )}
          </div>
        </section>

        {/* 2. 응시 목록 리스트 */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4 ml-1">
            📝 응시 기록 ({sortedResults.length})
          </h2>
          
          <div className="grid gap-3 md:grid-cols-2">
            {sortedResults.map((item) => (
              <div 
                key={item.id}
                onClick={() => setSelectedResult(item)}
                className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-blue-400 hover:shadow-md transition cursor-pointer flex justify-between items-center group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {/* [수정] 리스트에도 통합된 과목명 표시 */}
                    <span className="font-bold text-gray-800">
                      {normalizeSubject(item.subjectName)}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {item.examId}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString()} 응시
                  </p>
                </div>
                <div className="text-right">
                  <span className="block text-2xl font-extrabold text-blue-600 group-hover:scale-110 transition-transform">
                    {item.subjectName === '영어' ? `${item.totalScore} / 63` : item.totalScore}
                  </span>
                  <span className="text-xs text-gray-400">
                    {item.subjectName === '영어' ? '' : '점'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {sortedResults.length === 0 && (
            <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed">
              기록이 없습니다.
            </div>
          )}
        </section>
      </main>

      {/* 모달 */}
      {selectedResult && (
        <ResultModal 
          result={selectedResult} 
          onClose={() => setSelectedResult(null)} 
        />
      )}
    </div>
  );
}