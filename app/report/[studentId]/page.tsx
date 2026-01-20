import { db } from '@/lib/firebaseAdmin';
import DashboardClient from './DashboardClient';

interface PageProps {
  params: { studentId: string };
}

// Next.js 15에서는 params가 Promise일 수 있으므로 await 필요 (버전에 따라 다름)
export default async function StudentReportPage({ params }: any) {
  // 실제 params 객체 가져오기 (Next 15 대응)
  const { studentId } = await params;

  // 1. 학생 정보 조회
  const studentSnap = await db.collection('students').doc(studentId).get();
  
  if (!studentSnap.exists) {
    return <div className="p-10 text-center">학생 정보를 찾을 수 없습니다.</div>;
  }
  
  const studentData = studentSnap.data();

  // 2. 모든 시험 결과 조회
  const resultsSnap = await db.collection('testResults')
    .where('studentId', '==', studentId)
    .get();

  // 데이터를 직렬화 가능한 JSON 형태로 변환
  const results = resultsSnap.docs.map(doc => {
    const d = doc.data();
    return {
      id: doc.id,
      ...d,
      // Firestore Timestamp 등을 문자열로 변환 (직렬화 에러 방지)
      createdAt: d.createdAt || new Date().toISOString(),
    };
  }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // 최신순 정렬

  return (
    <DashboardClient 
      studentInfo={{ name: studentData?.name, number: studentData?.studentNumber }}
      results={results} 
    />
  );
}