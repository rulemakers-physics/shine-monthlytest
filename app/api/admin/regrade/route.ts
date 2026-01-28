import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { resultId, newExamId, newGrade, newSubjectName } = await req.json();

    if (!resultId || !newExamId || !newGrade || !newSubjectName) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    // 1. 기존 성적 데이터 가져오기 (학생이 입력한 답안 확보)
    const resultRef = db.collection('testResults').doc(resultId);
    const resultSnap = await resultRef.get();

    if (!resultSnap.exists) {
      return NextResponse.json({ error: '성적 데이터를 찾을 수 없습니다.' }, { status: 404 });
    }

    const oldData = resultSnap.data();
    const studentAnswers = oldData?.answers || [];

    // 2. 변경할 대상 과목의 시험지 정보(정답지) 가져오기
    // ID 생성 규칙: "고1_국어" 등 (ExamManager에서 생성하는 방식과 동일해야 함)
    const newSubjectId = `${newGrade}_${newSubjectName}`;
    const subjectRef = db.collection('exams').doc(newExamId).collection('subjects').doc(newSubjectId);
    const subjectSnap = await subjectRef.get();

    if (!subjectSnap.exists) {
      return NextResponse.json({ error: `해당 과목(${newSubjectId})의 정답지가 존재하지 않습니다.` }, { status: 404 });
    }

    const subjectConfig = subjectSnap.data();
    const { answerKey, scoreWeights, type, categories, startQuestionNumber } = subjectConfig!;

    // 3. 재채점 로직 (submit-test와 동일)
    let totalScore = 0;
    const detailResults: any[] = [];
    const scienceScores: Record<string, number> = {};
    const scienceTotals: Record<string, number> = {};

    studentAnswers.forEach((studentAns: number, idx: number) => {
      // 문항 수가 다를 경우 처리 (새 시험지가 더 짧으면 초과분 무시, 길면 뒤는 채점 불가)
      if (idx >= answerKey.length) return;

      const correctAns = answerKey[idx];
      const weight = scoreWeights[idx] || 4;
      const isCorrect = studentAns === correctAns;
      const qNum = idx + (startQuestionNumber || 1);

      if (isCorrect) {
        totalScore += weight;
        if (type === 'integrated_science' && categories) {
          const cat = categories[idx] || 'comm';
          scienceScores[cat] = (scienceScores[cat] || 0) + weight;
        }
      }

      if (type === 'integrated_science' && categories) {
        const cat = categories[idx] || 'comm';
        scienceTotals[cat] = (scienceTotals[cat] || 0) + weight;
      }

      detailResults.push({
        qNum,
        studentAns,
        correctAns,
        isCorrect,
        weight
      });
    });

    // 4. DB 업데이트
    await resultRef.update({
      examId: newExamId,
      subjectId: newSubjectId,
      subjectName: newSubjectName, // 단순 과목명 업데이트
      totalScore,
      detailResults,
      scienceAnalysis: type === 'integrated_science' ? { scores: scienceScores, totals: scienceTotals } : null,
      updatedAt: new Date().toISOString() // 수정 시간 기록
    });

    return NextResponse.json({ 
      success: true, 
      message: `[수정 완료] ${oldData?.studentName} 학생: ${oldData?.subjectName} -> ${newSubjectName} (점수: ${totalScore}점)` 
    });

  } catch (error) {
    console.error("재채점 에러:", error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}