import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { targetStudentId, sourceStudentIds } = await req.json();

    if (!targetStudentId || !sourceStudentIds || !Array.isArray(sourceStudentIds) || sourceStudentIds.length === 0) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    // 1. 병합 대상 성적 데이터 찾기 (sourceStudentIds에 속한 모든 성적)
    // Firestore 'in' 쿼리는 최대 10개까지 가능하므로 주의. 
    // 여기서는 안전하게 루프로 처리하거나 전체를 가져오는 방식이 아닌 쿼리로 처리.
    
    const updates: Promise<any>[] = [];
    const resultsRef = db.collection('testResults');
    
    // sourceId별로 쿼리 실행 (안전성 확보)
    for (const sourceId of sourceStudentIds) {
      if (sourceId === targetStudentId) continue; // 타겟과 소스가 같으면 스킵

      const snapshot = await resultsRef.where('studentId', '==', sourceId).get();
      
      snapshot.forEach(doc => {
        // 성적 데이터의 주인(studentId)을 targetStudentId로 변경
        updates.push(doc.ref.update({ 
          studentId: targetStudentId,
          updatedAt: new Date().toISOString(),
          mergeNote: `Merged from ${sourceId}`
        }));
      });

      // 학생 계정(sourceId) 삭제
      updates.push(db.collection('students').doc(sourceId).delete());
    }

    await Promise.all(updates);

    return NextResponse.json({ 
      success: true, 
      message: `총 ${updates.length}건의 데이터 처리 완료 (성적 이동 및 중복 계정 삭제)` 
    });

  } catch (error) {
    console.error("Merge Error:", error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}