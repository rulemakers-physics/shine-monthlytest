import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const studentNumber = searchParams.get('studentNumber');

  if (!studentNumber) {
    return NextResponse.json({ error: '학생 번호가 필요합니다.' }, { status: 400 });
  }

  try {
    // 해당 학생의 모든 시험 결과 조회
    const snapshot = await db.collection('testResults')
      .where('studentNumber', '==', studentNumber)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ history: [] });
    }

    const history = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        examId: data.examId,       // 예: "2026-03"
        subjectName: data.subjectName, // 예: "수학"
        totalScore: data.totalScore,
        createdAt: data.createdAt
      };
    });

    // 날짜순 정렬 (과거 -> 현재)
    history.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return NextResponse.json({ history });
  } catch (error) {
    console.error("히스토리 조회 실패:", error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}