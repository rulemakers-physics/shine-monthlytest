"use client";
import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  LineChart, Line, Legend
} from 'recharts';

interface ReportCardProps {
  result: {
    studentName: string;
    studentNumber: string;
    subjectName: string;
    totalScore: number;
    detailResults: any[];
    scienceAnalysis?: { scores: Record<string, number>; totals: Record<string, number> };
    createdAt?: string;
  };
}

// Tailwind 기본 색상 HEX 매핑 (html2canvas 오류 방지용)
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

// 차트 색상 팔레트
const CHART_COLORS = {
  국어: "#ef4444", 
  수학: "#3b82f6", 
  영어: "#f59e0b", 
  통합과학: "#10b981", 
  기타: "#8b5cf6" 
};

export default function ReportCard({ result }: ReportCardProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [comment, setComment] = useState("");
  const [historyData, setHistoryData] = useState<any[]>([]);

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
            grouped[key][item.subjectName] = item.totalScore;
          });

          setHistoryData(Object.values(grouped));
        }
      } catch (err) {
        console.error("히스토리 로딩 실패:", err);
      }
    };

    if (result.studentNumber) {
      fetchHistory();
    }
  }, [result.studentNumber]);

  const isScience = result.subjectName === "통합과학" && result.scienceAnalysis;
  
  const scienceData = isScience ? Object.keys(result.scienceAnalysis!.scores).map(key => ({
    subject: key === 'comm' ? '공통' : key,
    A: result.scienceAnalysis!.scores[key],
    fullMark: result.scienceAnalysis!.totals[key] || 20,
  })) : [];

  const totalQ = result.detailResults.length;
  const correctQ = result.detailResults.filter(r => r.isCorrect).length;
  const generalData = [
    { name: '내 정답 수', value: correctQ },
    { name: '전체 문항', value: totalQ }
  ];

  const handleDownloadImage = async () => {
    if (!reportRef.current) return;
    try {
      // backgroundColor 옵션 추가하여 투명 배경 방지
      const canvas = await html2canvas(reportRef.current, { 
        scale: 2,
        backgroundColor: "#ffffff" 
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `${result.studentName}_${result.subjectName}_성적리포트.png`;
      link.click();
    } catch (err) {
      console.error("이미지 저장 실패:", err);
      alert("이미지 저장 중 오류가 발생했습니다. (콘솔 확인)");
    }
  };

  const today = result.createdAt ? new Date(result.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
      {/* === 리포트 영역 (캡처 대상) === */}
      {/* Tailwind 색상 대신 style로 HEX 코드 직접 지정 */}
      <div 
        ref={reportRef} 
        className="w-full p-8 rounded-xl shadow-sm border"
        style={{ 
          minHeight: '600px', 
          backgroundColor: HEX.white, 
          borderColor: HEX.gray200,
          color: HEX.gray800
        }}
      >
        {/* 헤더 */}
        <header 
          className="flex justify-between items-center border-b-2 pb-4 mb-6"
          style={{ borderColor: HEX.blue500 }}
        >
          <div className="flex items-center gap-3">
            <img src="/favicon.ico" alt="Logo" className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-bold" style={{ color: HEX.gray900 }}>월례고사 성적 분석표</h1>
              <p className="text-xs" style={{ color: HEX.gray500 }}>샤인 독서실 | {today}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-2xl font-extrabold" style={{ color: HEX.blue600 }}>{result.totalScore}점</span>
            <span className="text-sm font-semibold" style={{ color: HEX.gray600 }}>{result.studentName} 학생</span>
          </div>
        </header>

        {/* 1. 이번 시험 분석 */}
        <section className="mb-8">
          <h3 
            className="text-sm font-bold mb-4 border-l-4 pl-2"
            style={{ color: HEX.gray700, borderColor: HEX.blue500 }}
          >
            📊 이번 시험 분석 ({result.subjectName})
          </h3>
          <div 
            className="h-56 w-full flex justify-center items-center rounded-lg p-2"
            style={{ backgroundColor: HEX.gray50 }}
          >
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
                <BarChart data={generalData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, totalQ]} hide />
                  <YAxis dataKey="name" type="category" width={70} tick={{fontSize: 12}} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="value" barSize={24} radius={[0, 4, 4, 0]}>
                    {generalData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? HEX.blue500 : HEX.gray200} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* 2. 성적 변화 추이 그래프 */}
        {historyData.length > 1 && (
          <section className="mb-8">
            <h3 
              className="text-sm font-bold mb-4 border-l-4 pl-2"
              style={{ color: HEX.gray700, borderColor: HEX.green500 }}
            >
              📈 과목별 성적 변화 추이
            </h3>
            <div 
              className="h-48 w-full rounded-lg border p-2"
              style={{ backgroundColor: HEX.white, borderColor: HEX.gray100 }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis domain={[0, 100]} tick={{fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', fontSize: '12px'}} 
                    itemStyle={{padding: 0}}
                  />
                  <Legend wrapperStyle={{fontSize: '11px', paddingTop: '10px'}} />
                  
                  {['국어', '수학', '영어', '통합과학'].map(sub => (
                    <Line 
                      key={sub}
                      type="monotone" 
                      dataKey={sub} 
                      stroke={(CHART_COLORS as any)[sub] || CHART_COLORS.기타} 
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
          <h3 
            className="text-sm font-bold mb-2 border-l-4 pl-2"
            style={{ color: HEX.gray700, borderColor: HEX.gray500 }}
          >
            📝 문항별 결과
          </h3>
          <div 
            className="grid grid-cols-6 gap-1 text-[10px] text-center border-t pt-2"
            style={{ borderColor: HEX.gray200 }}
          >
            {result.detailResults.map((item) => (
              <div 
                key={item.qNum} 
                className="p-1 rounded font-bold"
                style={{
                  backgroundColor: item.isCorrect ? HEX.blue50 : HEX.red50,
                  color: item.isCorrect ? HEX.blue600 : HEX.red600
                }}
              >
                {item.qNum} {item.isCorrect ? 'O' : 'X'}
              </div>
            ))}
          </div>
        </section>

        {/* 4. 선생님 코멘트 (출력용) */}
        <section>
          <h3 
            className="text-sm font-bold mb-2 border-l-4 pl-2"
            style={{ color: HEX.gray700, borderColor: HEX.purple500 }}
          >
            👩‍🏫 선생님 총평
          </h3>
          <div 
            className="p-4 rounded-lg min-h-[60px] text-sm whitespace-pre-wrap border"
            style={{ 
              backgroundColor: HEX.gray50, 
              color: HEX.gray700,
              borderColor: HEX.gray100
            }}
          >
            {comment || "작성된 총평이 없습니다."}
          </div>
        </section>
      </div>

      {/* === 컨트롤 영역 (캡처 제외) === */}
      <div className="w-full p-4 rounded-xl flex flex-col gap-3" style={{ backgroundColor: HEX.gray100 }}>
        <textarea
          className="w-full p-3 border rounded-lg text-sm focus:ring-2 outline-none"
          style={{ borderColor: HEX.gray200 }}
          placeholder="여기에 학부모님께 보낼 총평을 입력하세요..."
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button 
          onClick={handleDownloadImage}
          className="w-full text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition hover:opacity-90"
          style={{ backgroundColor: "#16a34a" }} // Green 600
        >
          <span>📸 이미지로 저장하기</span>
        </button>
      </div>
    </div>
  );
}