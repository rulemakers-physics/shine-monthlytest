import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin'; // 서버용 Admin SDK

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // subjectConfig는 클라이언트에서 받지 않고, ID만 받아서 서버가 조회합니다.
    const { examId, subjectId, studentNumber, studentName, answers } = body;

    if (!examId || !subjectId || !answers || !studentName || !studentNumber) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    // ----------------------------------------------------------------------
    // [STEP 1] 학생 식별 및 등록 로직 (Find or Create)
    // ----------------------------------------------------------------------
    const studentsRef = db.collection('students');
    // 이름과 번호가 모두 일치하는 학생이 있는지 확인
    const studentQuery = await studentsRef
      .where('studentNumber', '==', studentNumber)
      .where('name', '==', studentName)
      .get();

    let studentId = '';
    let isNewStudent = false;

    if (!studentQuery.empty) {
      // 1-1. 기존 학생이 존재하면 ID 가져오기
      studentId = studentQuery.docs[0].id;
    } else {
      // 1-2. 기존 데이터가 없으면 새 학생으로 등록
      const newStudentDoc = await studentsRef.add({
        name: studentName,
        studentNumber: studentNumber,
        createdAt: new Date().toISOString(),
        // 추후 학부모 전화번호 등 추가 정보 필드 확장 가능
        // parentPhone: "", 
      });
      studentId = newStudentDoc.id;
      isNewStudent = true;
    }
    // ----------------------------------------------------------------------


    // [STEP 2] 시험지 정보 조회 (보안 강화)
    const subjectRef = db.collection('exams').doc(examId).collection('subjects').doc(subjectId);
    const subjectSnap = await subjectRef.get();

    if (!subjectSnap.exists) {
      return NextResponse.json({ error: '시험 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    const subjectConfig = subjectSnap.data();
    const { answerKey, scoreWeights, type, categories, startQuestionNumber, subjectName } = subjectConfig!;

    let totalScore = 0;
    const detailResults: any[] = []; 
    
    // 과학용 상세 분석 데이터
    const scienceScores: Record<string, number> = {}; 
    const scienceTotals: Record<string, number> = {};

    // [STEP 3] 채점 루프
    answers.forEach((studentAns: number, idx: number) => {
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

    // [STEP 4] 결과 DB 저장 (studentId 포함)
    const resultDoc = {
      examId,
      subjectId,
      subjectName,
      
      // 학생 연결 정보 저장
      studentId,      // 핵심: 이 ID로 나중에 학생별 데이터를 모을 수 있습니다.
      studentNumber,
      studentName,
      
      answers,
      totalScore,
      detailResults,
      scienceAnalysis: type === 'integrated_science' ? { scores: scienceScores, totals: scienceTotals } : null,
      createdAt: new Date().toISOString()
    };
    
    await db.collection('testResults').add(resultDoc);

    // [STEP 5] 응답 반환
    return NextResponse.json({
      message: "채점 완료",
      totalScore,
      studentName,
      subjectName,
      detailResults,
      wrongQuestions: detailResults.filter(d => !d.isCorrect).map(d => d.qNum),
      isNewStudent // 클라이언트에서 '신규 학생 등록됨' 표시를 하고 싶다면 활용 가능
    });

  } catch (error) {
    console.error("채점 에러:", error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}