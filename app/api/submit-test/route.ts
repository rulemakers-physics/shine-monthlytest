import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin'; // 서버용 Admin SDK

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { examId, subjectId, studentNumber, studentName, answers, subjectConfig } = body;

    // 1. 보안을 위해 DB에서 정답지 다시 로드 (권장되나 여기선 subjectConfig 신뢰 예시)
    const { answerKey, scoreWeights, type, categories } = subjectConfig;
    
    let totalScore = 0;
    let detailScores = { correctCount: 0, wrongQuestions: [] as number[] };
    
    // 과학용 상세 분석 데이터
    const scienceScores: any = {}; 
    const scienceTotals: any = {};

    // 2. 채점 루프
    answers.forEach((studentAns: number, idx: number) => {
      const correctAns = answerKey[idx];
      const weight = scoreWeights[idx] || 4; // 배점
      const isCorrect = studentAns === correctAns;
      
      if (isCorrect) {
        totalScore += weight;
        detailScores.correctCount++;
        
        // 과학 상세 분석
        if (type === 'integrated_science' && categories) {
          const cat = categories[idx] || 'comm';
          if (!scienceScores[cat]) scienceScores[cat] = 0;
          scienceScores[cat] += weight; // 혹은 맞은 개수
        }
      } else {
        // 틀린 문제 번호 저장 (시작 번호 고려)
        detailScores.wrongQuestions.push(idx + subjectConfig.startQuestionNumber);
      }
      
      // 과학 총점 집계
      if (type === 'integrated_science' && categories) {
        const cat = categories[idx] || 'comm';
        if (!scienceTotals[cat]) scienceTotals[cat] = 0;
        scienceTotals[cat] += weight;
      }
    });

    // 3. 결과 DB 저장 (누적)
    const resultDoc = {
      examId,
      subjectId,
      studentNumber,
      studentName,
      answers,
      totalScore,
      detailScores, // 틀린 문제 목록 등
      scienceAnalysis: type === 'integrated_science' ? { scores: scienceScores, totals: scienceTotals } : null,
      createdAt: new Date().toISOString()
    };
    
    // 학생 식별을 위해 collection을 구조화하거나, 그냥 results에 다 넣고 쿼리
    await db.collection('testResults').add(resultDoc);

    // 4. 클라이언트에 보낼 응답
    return NextResponse.json({
      message: "채점 완료",
      totalScore,
      studentName,
      subjectName: subjectConfig.subjectName,
      wrongQuestions: detailScores.wrongQuestions
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}