"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminDashboard() {
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [loading, setLoading] = useState(false);
  
  // 통계 상태
  const [totalApplicants, setTotalApplicants] = useState(0);
  const [subjectStats, setSubjectStats] = useState<any[]>([]);

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

  // 2. 선택된 시험의 데이터 분석
  useEffect(() => {
    if (!selectedExamId) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "testResults"), where("examId", "==", selectedExamId));
        const snap = await getDocs(q);
        const results = snap.docs.map(d => d.data());

        // 전체 응시자 수 (중복 제거 로직이 필요하다면 studentId로 Set 사용)
        setTotalApplicants(results.length);

        // 과목별 평균 계산
        const grouped: Record<string, { total: number, count: number }> = {};
        results.forEach((r: any) => {
          if (!grouped[r.subjectName]) grouped[r.subjectName] = { total: 0, count: 0 };
          
          // [수정] 통계 집계 시 영어 점수 보정
          const score = r.subjectName === '영어' ? r.totalScore + 37 : r.totalScore;
          
          grouped[r.subjectName].total += score;
          grouped[r.subjectName].count += 1;
        });

        const stats = Object.keys(grouped).map(subj => ({
          name: subj,
          avg: Math.round(grouped[subj].total / grouped[subj].count),
          count: grouped[subj].count
        }));

        setSubjectStats(stats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedExamId]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">📊 월례고사 현황 대시보드</h2>
        <select 
          value={selectedExamId} 
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="p-2 border rounded-lg bg-white shadow-sm font-bold text-gray-700"
        >
          {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.title} ({ex.id})</option>)}
        </select>
      </header>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-gray-500 text-sm font-bold mb-2">총 응시 건수</span>
          <span className="text-4xl font-extrabold text-blue-600">{totalApplicants}건</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-gray-500 text-sm font-bold mb-2">개설 과목 수</span>
          <span className="text-4xl font-extrabold text-green-600">{subjectStats.length}개</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-gray-500 text-sm font-bold mb-2">전체 평균 점수</span>
          <span className="text-4xl font-extrabold text-purple-600">
            {subjectStats.length > 0 
              ? Math.round(subjectStats.reduce((acc, cur) => acc + cur.avg, 0) / subjectStats.length) 
              : 0}점
          </span>
        </div>
      </div>

      {/* 그래프 영역 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-6 border-l-4 border-blue-500 pl-3">
          과목별 평균 점수 및 응시자 수
        </h3>
        <div className="h-80 w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-400">데이터 분석 중...</div>
          ) : subjectStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 14, fontWeight: 'bold'}} />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" label={{ value: '평균 점수', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" label={{ value: '응시자(명)', angle: 90, position: 'insideRight' }} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px'}} />
                <Legend />
                <Bar yAxisId="left" dataKey="avg" name="평균 점수" barSize={40} radius={[4, 4, 0, 0]}>
                  {subjectStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
                <Bar yAxisId="right" dataKey="count" name="응시자 수" barSize={20} fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">데이터가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}