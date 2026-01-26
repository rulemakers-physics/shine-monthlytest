"use client";
import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import ResultModal from '@/app/components/ResultModal';

// [수정] 고3 선택 과목에 대한 색상 추가 (국어 계열은 빨강, 수학 계열은 파랑 통일 추천)
const COLORS = {
  // 공통
  국어: "#ef4444", 수학: "#3b82f6", 영어: "#f59e0b", 통합과학: "#10b981", 기타: "#8b5cf6",
  // 고3 국어 선택
  "화법과 작문": "#ef4444", "언어와 매체": "#b91c1c", // 같은 계열 다른 톤
  // 고3 수학 선택
  "확률과 통계": "#3b82f6", "미적분": "#2563eb", "기하": "#1d4ed8"
};

export default function DashboardClient({ studentInfo, results }: { studentInfo: any, results: any[] }) {
  const [selectedResult, setSelectedResult] = useState<any>(null);

  // 1. 차트용 데이터 가공 (과거 -> 현재 순으로 재정렬)
  const chartData = [...results].reverse().reduce((acc: any[], curr: any) => {
    // 날짜 혹은 시험명으로 라벨링
    const label = curr.examId.includes('-') 
      ? `${parseInt(curr.examId.split('-')[1])}월` // "2026-03" -> "3월"
      : curr.examId;
      
    // 같은 시험(월)에 여러 과목이 있을 수 있으므로 그룹핑
    const existing = acc.find(item => item.name === label);
    if (existing) {
      existing[curr.subjectName] = curr.totalScore;
    } else {
      acc.push({ name: label, [curr.subjectName]: curr.totalScore });
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
                  
                  {/* 표시할 모든 과목 목록을 배열로 정의 */}
                  {[
                    '국어', '수학', '영어', '통합과학',
                    '화법과 작문', '언어와 매체',
                    '확률과 통계', '미적분', '기하'
                  ].map(sub => (
                    <Line 
                      key={sub}
                      type="monotone" 
                      dataKey={sub} 
                      stroke={(COLORS as any)[sub] || COLORS.기타} 
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
            📝 응시 기록 ({results.length})
          </h2>
          
          <div className="grid gap-3 md:grid-cols-2">
            {results.map((item) => (
              <div 
                key={item.id}
                onClick={() => setSelectedResult(item)}
                className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-blue-400 hover:shadow-md transition cursor-pointer flex justify-between items-center group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-800">{item.subjectName}</span>
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
                    {item.totalScore}
                  </span>
                  <span className="text-xs text-gray-400">점</span>
                </div>
              </div>
            ))}
          </div>
          
          {results.length === 0 && (
            <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed">
              기록이 없습니다.
            </div>
          )}
        </section>
      </main>

      {/* 모달: 클릭 시 상세 성적표(ReportCard) 표시 */}
      {selectedResult && (
        <ResultModal 
          result={selectedResult} 
          onClose={() => setSelectedResult(null)} 
        />
      )}
    </div>
  );
}