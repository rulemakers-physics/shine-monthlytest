"use client";
import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  LineChart, Line, Legend, LabelList
} from 'recharts';

// ... (HEX 상수는 그대로 유지) ...
const HEX = {
  white: "#ffffff",
  black: "#000000",
  blue600: "#2563eb",
  blue500: "#3b82f6",
  blue50: "#eff6ff",
  red600: "#dc2626",
  red50: "#fef2f2",
  gray900: "#111827",
  gray800: "#1f2937",
  gray700: "#374151",
  gray600: "#4b5563",
  gray500: "#6b7280",
  gray200: "#e5e7eb",
  gray100: "#f3f4f6",
  gray50: "#f9fafb",
  green500: "#22c55e",
  purple500: "#a855f7",
};

// [수정] 통합된 과목 색상
const CHART_COLORS: Record<string, string> = {
  국어: "#ef4444", 수학: "#3b82f6", 영어: "#f59e0b", 통합과학: "#10b981", 기타: "#8b5cf6"
};

// [추가] 표시 순서 및 매핑 함수
const SUBJECT_ORDER = ['국어', '수학', '영어', '통합과학'];
const normalizeSubject = (subject: string) => {
  if (['화법과 작문', '언어와 매체'].includes(subject)) return '국어';
  if (['확률과 통계', '미적분', '기하'].includes(subject)) return '수학';
  return subject;
};

interface ReportCardProps {
  result: {
    examId: string;
    subjectId: string;
    studentName: string;
    studentNumber: string;
    subjectName: string;
    totalScore: number;
    detailResults: any[];
    scienceAnalysis?: { scores: Record<string, number>; totals: Record<string, number> };
    createdAt?: string;
  };
}

export default function ReportCard({ result }: ReportCardProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [comment, setComment] = useState("");
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [stats, setStats] = useState<{ average: number, qStats: Record<string, number> } | null>(null);

  // [수정] 리포트 제목에 표시할 과목명 (통합명 사용)
  const displaySubjectName = normalizeSubject(result.subjectName);

  // 영어 점수 표기 로직
  const isEnglish = result.subjectName === '영어';
  const displayScore = isEnglish ? `${result.totalScore} / 63` : `${result.totalScore}점`;

  // 통계 데이터 fetch (기존 코드 유지)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/get-exam-stats?examId=${result.examId}&subjectId=${result.subjectId}`);
        const data = await res.json();
        if (data.average !== undefined) setStats(data);
      } catch (err) { console.error(err); }
    };
    if (result.examId && result.subjectId) fetchStats();
  }, [result.examId, result.subjectId]);

  // 히스토리 fetch (수정됨)
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/student-history?studentNumber=${result.studentNumber}`);
        const data = await res.json();
        
        if (data.history) {
          const grouped: Record<string, any> = {};
          
          data.history.forEach((item: any) => {
            const key = item.examId; 
            if (!grouped[key]) {
              const label = key.includes('-') ? `${parseInt(key.split('-')[1])}월` : key;
              grouped[key] = { name: label };
            }
            // [수정] 히스토리 데이터도 통합명으로 그룹핑
            const subj = normalizeSubject(item.subjectName);
            grouped[key][subj] = item.totalScore;
          });

          setHistoryData(Object.values(grouped));
        }
      } catch (err) {
        console.error("히스토리 로딩 실패:", err);
      }
    };

    if (result.studentNumber) fetchHistory();
  }, [result.studentNumber]);

  const isScience = result.subjectName === "통합과학" && result.scienceAnalysis;
  // ... (scienceData 생성 로직 유지) ...
  const scienceData = isScience ? Object.keys(result.scienceAnalysis!.scores).map(key => ({
    subject: key === 'comm' ? '공통' : key,
    A: result.scienceAnalysis!.scores[key],
    fullMark: result.scienceAnalysis!.totals[key] || 20,
  })) : [];

  const compareData = [
    { name: '내 점수', value: result.totalScore },
    { name: '전체 평균', value: stats ? stats.average : 0 }
  ];

  const handleDownloadImage = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `${result.studentName}_${displaySubjectName}_성적리포트.png`;
      link.click();
    } catch (err) {
      console.error(err);
      alert("이미지 저장 오류");
    }
  };

  const today = result.createdAt ? new Date(result.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
      <div 
        ref={reportRef} 
        className="w-full p-8 rounded-xl shadow-sm border"
        style={{ minHeight: '600px', backgroundColor: HEX.white, borderColor: HEX.gray200, color: HEX.gray800 }}
      >
        {/* 헤더 */}
        <header className="flex justify-between items-center border-b-2 pb-4 mb-6" style={{ borderColor: HEX.blue500 }}>
          <div className="flex items-center gap-3">
            <img src="/favicon.ico" alt="Logo" className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-bold" style={{ color: HEX.gray900 }}>월례고사 성적 분석표</h1>
              <p className="text-xs" style={{ color: HEX.gray500 }}>샤인 독서실 | {today}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-2xl font-extrabold" style={{ color: HEX.blue600 }}>{displayScore}</span>
            <span className="text-sm font-semibold" style={{ color: HEX.gray600 }}>{result.studentName} 학생</span>
          </div>
        </header>

        {isEnglish && (
          <div className="mb-6 p-3 rounded text-center text-sm font-bold" style={{ backgroundColor: HEX.red50, color: HEX.red600 }}>
            ※ 영어는 듣기평가를 제외한 성적(63점 만점)입니다.
          </div>
        )}

        {/* 1. 분석 섹션 */}
        <section className="mb-8">
          <h3 className="text-sm font-bold mb-4 border-l-4 pl-2" style={{ color: HEX.gray700, borderColor: HEX.blue500 }}>
            {/* [수정] 제목에 통합된 과목명 표시 */}
            📊 이번 시험 분석 ({displaySubjectName})
          </h3>
          <div className="h-56 w-full flex justify-center items-center rounded-lg p-2" style={{ backgroundColor: HEX.gray50 }}>
            {isScience ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={scienceData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{fontSize: 12}} />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} />
                  <Radar name="내 점수" dataKey="A" stroke={HEX.blue600} fill={HEX.blue500} fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, isEnglish ? 63 : 100]} hide />
                  <YAxis dataKey="name" type="category" width={70} tick={{fontSize: 12, fontWeight: 'bold'}} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="value" barSize={30} radius={[0, 4, 4, 0]}>
                    {compareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? HEX.blue500 : HEX.gray500} />
                    ))}
                    <LabelList dataKey="value" position="right" style={{ fill: HEX.gray700, fontSize: 12, fontWeight: 'bold' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* 2. 변화 추이 (통합된 과목명 사용) */}
        {historyData.length > 1 && (
          <section className="mb-8">
            <h3 className="text-sm font-bold mb-4 border-l-4 pl-2" style={{ color: HEX.gray700, borderColor: HEX.green500 }}>
              📈 과목별 성적 변화 추이
            </h3>
            <div className="h-48 w-full rounded-lg border p-2" style={{ backgroundColor: HEX.white, borderColor: HEX.gray100 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis domain={[0, 100]} tick={{fontSize: 12}} />
                  <Tooltip contentStyle={{borderRadius: '8px', fontSize: '12px'}} itemStyle={{padding: 0}} />
                  <Legend wrapperStyle={{fontSize: '11px', paddingTop: '10px'}} />
                  
                  {/* [수정] 통합된 국수영탐 순서대로 라인 표시 */}
                  {SUBJECT_ORDER.map(sub => (
                    <Line 
                      key={sub}
                      type="monotone" 
                      dataKey={sub} 
                      stroke={CHART_COLORS[sub] || CHART_COLORS.기타} 
                      strokeWidth={2} 
                      dot={{r:3}} 
                      connectNulls 
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* 3. 상세 채점표 */}
        <section className="mb-6">
          <h3 className="text-sm font-bold mb-2 border-l-4 pl-2" style={{ color: HEX.gray700, borderColor: HEX.gray500 }}>
            📝 문항별 결과 & 정답률
          </h3>
          <div className="grid grid-cols-6 gap-2 text-[10px] text-center border-t pt-2" style={{ borderColor: HEX.gray200 }}>
            {result.detailResults.map((item) => (
              <div 
                key={item.qNum} 
                className="p-1 rounded flex flex-col items-center justify-center border"
                style={{
                  backgroundColor: item.isCorrect ? HEX.blue50 : HEX.red50,
                  borderColor: item.isCorrect ? HEX.blue50 : HEX.red50,
                  color: item.isCorrect ? HEX.blue600 : HEX.red600
                }}
              >
                <span className="font-bold text-xs">{item.qNum}번</span>
                <span>{item.isCorrect ? 'O' : 'X'}</span>
                {stats && stats.qStats[item.qNum] !== undefined && (
                  <span className="text-[9px] mt-1 text-gray-500 bg-white px-1 rounded border">
                    {stats.qStats[item.qNum]}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}