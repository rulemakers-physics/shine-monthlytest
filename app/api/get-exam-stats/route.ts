import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const examId = searchParams.get('examId');
  const subjectId = searchParams.get('subjectId');

  if (!examId || !subjectId) {
    return NextResponse.json({ error: '파라미터 부족' }, { status: 400 });
  }

  try {
    // 해당 시험, 해당 과목의 모든 성적표 조회
    const snapshot = await db.collection('testResults')
      .where('examId', '==', examId)
      .where('subjectId', '==', subjectId)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ average: 0, qStats: {} });
    }

    const totalDocs = snapshot.size;
    let sumScore = 0;
    const qCorrectCounts: Record<string, number> = {};

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      sumScore += data.totalScore;

      // 문항별 정답 카운트
      if (Array.isArray(data.detailResults)) {
        data.detailResults.forEach((q: any) => {
          if (q.isCorrect) {
            qCorrectCounts[q.qNum] = (qCorrectCounts[q.qNum] || 0) + 1;
          }
        });
      }
    });

    // 평균 점수 (반올림)
    const average = Math.round(sumScore / totalDocs);

    // 문항별 정답률 (%) 계산
    const qStats: Record<string, number> = {};
    Object.keys(qCorrectCounts).forEach(qNum => {
      qStats[qNum] = Math.round((qCorrectCounts[qNum] / totalDocs) * 100);
    });

    return NextResponse.json({ average, qStats, totalDocs });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}