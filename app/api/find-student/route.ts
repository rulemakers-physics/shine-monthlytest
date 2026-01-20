import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { name, number } = await req.json();

    if (!name || !number) {
      return NextResponse.json({ error: '이름과 번호를 입력해주세요.' }, { status: 400 });
    }

    const studentsRef = db.collection('students');
    const query = await studentsRef
      .where('name', '==', name)
      .where('studentNumber', '==', number)
      .get();

    if (query.empty) {
      return NextResponse.json({ found: false });
    }

    // 학생 ID 반환
    return NextResponse.json({ found: true, studentId: query.docs[0].id });

  } catch (error) {
    console.error("학생 조회 에러:", error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}