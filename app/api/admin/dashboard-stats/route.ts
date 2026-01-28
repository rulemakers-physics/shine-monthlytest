import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const examId = searchParams.get('examId');

  if (!examId) {
    return NextResponse.json({ error: 'examId is required' }, { status: 400 });
  }

  try {
    // 해당 시험의 모든 결과 조회
    const snapshot = await db.collection('testResults')
      .where('examId', '==', examId)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ 
        totalApplicants: 0, 
        gradeStats: [], 
        subjectOverview: [],
        detailedStats: {} 
      });
    }

    // 데이터 집계용 변수
    let totalApplicants = 0;
    const gradeCounts: Record<string, number> = {};
    const subjectGroups: Record<string, any> = {};

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const { subjectId, subjectName, totalScore, studentName, detailResults } = data;
      
      totalApplicants++;

      // 1. 학년별 비율 (subjectId: '고1_국어' -> '고1')
      const grade = subjectId.split('_')[0] || '기타';
      gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;

      // 과목별 그룹핑 키 (고1 국어, 고2 수학 등 구분을 위해 subjectId 사용)
      if (!subjectGroups[subjectId]) {
        subjectGroups[subjectId] = {
          id: subjectId,
          grade,
          name: subjectName,
          totalScoreSum: 0,
          count: 0,
          maxScore: -1,
          topScorers: [],
          scoreDist: new Array(11).fill(0), // 0~10 구간 (10점 단위)
          wrongCounts: {} // 문항별 오답 수
        };
      }

      const group = subjectGroups[subjectId];
      group.totalScoreSum += totalScore;
      group.count++;

      // 2. 명예의 전당 (최고점 갱신)
      if (totalScore > group.maxScore) {
        group.maxScore = totalScore;
        group.topScorers = [studentName];
      } else if (totalScore === group.maxScore) {
        group.topScorers.push(studentName);
      }

      // 3. 점수 분포 (10점 단위)
      const distIndex = Math.min(Math.floor(totalScore / 10), 10);
      group.scoreDist[distIndex]++;

      // 4. 킬러 문항 (오답 카운트)
      if (Array.isArray(detailResults)) {
        detailResults.forEach((q: any) => {
          if (!q.isCorrect) {
            group.wrongCounts[q.qNum] = (group.wrongCounts[q.qNum] || 0) + 1;
          }
        });
      }
    });

    // 데이터 가공 및 정렬
    
    // 학년별 파이 차트 데이터
    const gradeStats = Object.entries(gradeCounts).map(([name, value]) => ({ name, value }));

    // 과목별 개요 (평균, 응시자 수) -> 기존 바 차트용
    const subjectOverview = Object.values(subjectGroups).map((g: any) => ({
      name: `${g.grade} ${g.name}`,
      grade: g.grade,
      subject: g.name,
      avg: Math.round(g.totalScoreSum / g.count),
      count: g.count,
      id: g.id
    })).sort((a, b) => a.name.localeCompare(b.name));

    // 과목별 상세 데이터 (명예의 전당, 분포, 킬러 문항)
    const detailedStats: Record<string, any> = {};
    Object.values(subjectGroups).forEach((g: any) => {
      // 킬러 문항 정렬 (오답률 높은 순 TOP 5)
      const killerQuestions = Object.entries(g.wrongCounts)
        .map(([qNum, count]: [string, any]) => ({
          qNum: Number(qNum),
          rate: Math.round((count / g.count) * 100)
        }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 5);

      // 점수 분포 포맷팅
      const distribution = g.scoreDist.map((count: number, idx: number) => ({
        name: idx === 10 ? '100' : `${idx * 10}~${idx * 10 + 9}`,
        count
      }));

      detailedStats[g.id] = {
        topScorers: g.topScorers,
        maxScore: g.maxScore,
        distribution,
        killerQuestions
      };
    });

    return NextResponse.json({
      totalApplicants,
      gradeStats,
      subjectOverview,
      detailedStats
    });

  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}