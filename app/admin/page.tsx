"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList,
  PieChart, Pie
} from 'recharts';

// 차트 색상 팔레트
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];
const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'];

export default function AdminDashboard() {
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [loading, setLoading] = useState(false);
  
  // 데이터 상태
  const [data, setData] = useState<any>({
    totalApplicants: 0,
    gradeStats: [],
    subjectOverview: [],
    detailedStats: {}
  });

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  // 1. 시험 목록 로딩
  useEffect(() => {
    const fetchExams = async () => {
      const snap = await getDocs(collection(db, "exams"));
      const list = snap.docs.map(d => d.data()).sort((a:any, b:any) => b.id.localeCompare(a.id));
      setExams(list);
      if(list.length > 0) setSelectedExamId(list[0].id);
    };
    fetchExams();
  }, []);

  // 2. 통계 데이터 로딩 및 정렬
  useEffect(() => {
    if (!selectedExamId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/dashboard-stats?examId=${selectedExamId}`);
        const json = await res.json();
        
        // [핵심] 과목 표시 순서 정렬 로직
        if (json.subjectOverview) {
          json.subjectOverview.sort((a: any, b: any) => {
            // 1순위: 학년 (고1 -> 고2 -> 고3)
            const gradeOrder: Record<string, number> = { '고1': 1, '고2': 2, '고3': 3 };
            const gradeA = gradeOrder[a.grade] || 99;
            const gradeB = gradeOrder[b.grade] || 99;
            if (gradeA !== gradeB) return gradeA - gradeB;

            // 2순위: 과목 (학년별 상이)
            let subjOrder: Record<string, number> = {};
            if (a.grade === '고3') {
               // 고3 순서: 화작, 언매, 확통, 미적, 기하, 영어
               subjOrder = { '화법과 작문': 1, '언어와 매체': 2, '확률과 통계': 3, '미적분': 4, '기하': 5, '영어': 6 };
            } else {
               // 고1,2 순서: 국어, 수학, 영어, 통합과학
               subjOrder = { '국어': 1, '수학': 2, '영어': 3, '통합과학': 4 };
            }
            
            const orderA = subjOrder[a.subject] || 99;
            const orderB = subjOrder[b.subject] || 99;
            return orderA - orderB;
          });
        }

        setData(json);
        
        // 상세 탭 초기값 설정
        if (json.subjectOverview.length > 0) {
          setSelectedSubjectId(json.subjectOverview[0].id);
        } else {
          setSelectedSubjectId("");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedExamId]);

  const currentDetail = data.detailedStats[selectedSubjectId];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">📊 월례고사 통합 분석</h2>
        <select 
          value={selectedExamId} 
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="p-2 border rounded-lg bg-white shadow-sm font-bold text-gray-700 min-w-[200px]"
        >
          {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.title} ({ex.id})</option>)}
        </select>
      </header>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-400">데이터 분석 중...</div>
      ) : (
        <>
          {/* 1. 상단 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center gap-4">
              <div className="text-center">
                <span className="text-gray-500 text-sm font-bold">총 응시 건수</span>
                <div className="text-4xl font-extrabold text-blue-600 mt-1">{data.totalApplicants}건</div>
              </div>
              <div className="w-full border-t pt-4 text-center">
                <span className="text-gray-500 text-sm font-bold">개설 과목</span>
                <span className="text-xl font-bold text-gray-800 ml-2">{data.subjectOverview.length}개</span>
              </div>
            </div>

            <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-around">
              <div className="h-48 w-48 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.gradeStats} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                      {data.gradeStats.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs font-bold text-gray-400">학년비율</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-3 mt-4 md:mt-0">
                <h3 className="font-bold text-gray-700 mb-1">🏫 학년별 응시 현황</h3>
                {data.gradeStats.map((stat: any, idx: number) => (
                  <div key={stat.name} className="flex items-center justify-between w-40 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></div>
                      <span className="text-gray-600">{stat.name}</span>
                    </div>
                    <span className="font-bold text-gray-800">{stat.value}명 ({Math.round(stat.value / data.totalApplicants * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. 과목별 평균/응시자 그래프 */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6 border-l-4 border-blue-500 pl-3">
              📈 학년/과목별 평균 점수 현황
            </h3>
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.subjectOverview} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 'bold'}} angle={-30} textAnchor="end" interval={0} />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px'}} />
                  <Legend wrapperStyle={{paddingTop: '20px'}} />
                  
                  <Bar yAxisId="left" dataKey="avg" name="평균 점수" barSize={30} radius={[4, 4, 0, 0]}>
                    {data.subjectOverview.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    <LabelList dataKey="avg" position="top" style={{ fill: '#666', fontSize: 11, fontWeight: 'bold' }} />
                  </Bar>
                  <Bar yAxisId="right" dataKey="count" name="응시자 수" barSize={15} fill="#e5e7eb" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="count" position="top" style={{ fill: '#999', fontSize: 10 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 3. 과목별 상세 분석 */}
          {selectedSubjectId && currentDetail && (
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
                <h3 className="text-lg font-bold text-gray-800 border-l-4 border-purple-500 pl-3">
                  🔎 과목별 심층 분석
                </h3>
                <select 
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="p-2 border border-purple-200 rounded-lg text-sm font-bold text-gray-700 bg-purple-50 focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  {data.subjectOverview.map((sub: any) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 3-1. 명예의 전당 */}
                <div className="lg:col-span-3 bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-100 flex items-center justify-between">
                  <div>
                    <span className="block text-yellow-600 font-bold text-sm mb-1">🏆 명예의 전당 (최고 득점)</span>
                    <div className="text-3xl font-extrabold text-yellow-800">
                      {currentDetail.maxScore}점
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-yellow-600 font-bold block mb-1">Top Class Students</span>
                    <div className="flex flex-wrap justify-end gap-2">
                      {currentDetail.topScorers.map((name: string, i: number) => (
                        <span key={i} className="bg-white px-3 py-1 rounded-full shadow-sm text-sm font-bold text-gray-700 border border-yellow-200">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3-2. 점수대별 분포 */}
                <div className="lg:col-span-2">
                  <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                    📊 점수대별 분포도
                    <span className="text-xs font-normal text-gray-400">(단위: 명)</span>
                  </h4>
                  <div className="h-64 w-full bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={currentDetail.distribution}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{fontSize: 11}} />
                        <YAxis allowDecimals={false} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40}>
                          <LabelList dataKey="count" position="top" style={{ fill: '#666', fontSize: 11 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 3-3. 킬러 문항 */}
                <div>
                  <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                    😈 킬러 문항 (오답률 TOP 5)
                  </h4>
                  <div className="space-y-3">
                    {currentDetail.killerQuestions.length > 0 ? (
                      currentDetail.killerQuestions.map((q: any, idx: number) => (
                        <div key={q.qNum} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <span className={`
                            w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold text-white
                            ${idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-orange-500' : 'bg-gray-400'}
                          `}>
                            {idx + 1}
                          </span>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-bold text-gray-700">{q.qNum}번 문항</span>
                              <span className="text-sm font-bold text-red-600">{q.rate}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${q.rate}%` }}></div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-400 py-10">오답 데이터가 없습니다.</div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}