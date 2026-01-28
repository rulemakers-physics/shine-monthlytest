import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  try {
    // 1. 학생 중복 조회 (이름 + 번호가 같은 문서가 2개 이상인 경우)
    const studentsSnap = await db.collection('students').get();
    const studentMap = new Map();
    const duplicateStudents: any[] = [];

    studentsSnap.forEach(doc => {
      const data = doc.data();
      const key = `${data.name}_${data.studentNumber}`;
      if (studentMap.has(key)) {
        studentMap.get(key).push({ id: doc.id, ...data });
      } else {
        studentMap.set(key, [{ id: doc.id, ...data }]);
      }
    });

    studentMap.forEach((list) => {
      if (list.length > 1) {
        // 생성일자순 정렬
        list.sort((a:any, b:any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        duplicateStudents.push(list);
      }
    });

    // 2. 성적 중복 조회 (학생번호 + 시험ID + 과목ID가 같은 결과가 2개 이상인 경우)
    const resultsSnap = await db.collection('testResults').get();
    const resultMap = new Map();
    const duplicateResults: any[] = [];

    resultsSnap.forEach(doc => {
      const data = doc.data();
      // 중복 판단 키: 학생번호_시험회차_과목명
      const key = `${data.studentNumber}_${data.examId}_${data.subjectId}`;
      
      if (resultMap.has(key)) {
        resultMap.get(key).push({ id: doc.id, ...data });
      } else {
        resultMap.set(key, [{ id: doc.id, ...data }]);
      }
    });

    resultMap.forEach((list) => {
      if (list.length > 1) {
        // 최신순 정렬 (가장 최근에 생성된 것이 위로)
        list.sort((a:any, b:any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        duplicateResults.push(list);
      }
    });

    return NextResponse.json({
      duplicateStudents,
      duplicateResults
    });

  } catch (error) {
    console.error("중복 조회 에러:", error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

// 삭제 요청 처리
export async function DELETE(req: NextRequest) {
  try {
    const { collectionName, docId } = await req.json();
    if (!collectionName || !docId) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });

    await db.collection(collectionName).doc(docId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Delete Failed' }, { status: 500 });
  }
}