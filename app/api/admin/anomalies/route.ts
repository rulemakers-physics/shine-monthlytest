import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  try {
    // 1. 모든 성적 데이터 가져오기
    const resultsSnap = await db.collection('testResults').get();
    const allResults: any[] = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. 모든 학생 데이터 가져오기 (중복 계정 찾기용)
    const studentsSnap = await db.collection('students').get();
    const studentMap: Record<string, any[]> = {}; // Key: "이름_번호"

    studentsSnap.forEach(doc => {
      const data = doc.data();
      const key = `${data.name}_${data.studentNumber}`;
      if (!studentMap[key]) studentMap[key] = [];
      studentMap[key].push({ id: doc.id, ...data });
    });

    // ----------------------------------------------------
    // [Case A] 학년 혼재 (기존 로직 유지 및 최적화)
    // ----------------------------------------------------
    const resultsByExamStudent: Record<string, any[]> = {};
    allResults.forEach(r => {
      const key = `${r.examId}_${r.studentNumber}`;
      if (!resultsByExamStudent[key]) resultsByExamStudent[key] = [];
      resultsByExamStudent[key].push(r);
    });

    const mixedGradeCases: any[] = [];
    Object.entries(resultsByExamStudent).forEach(([key, results]) => {
      const gradeSet = new Set<string>();
      const details: any[] = [];

      results.forEach((r: any) => {
        const grade = r.subjectId?.split('_')[0];
        if (grade) {
          gradeSet.add(grade);
          details.push({
            subject: r.subjectName,
            grade: grade,
            score: r.totalScore,
            docId: r.id
          });
        }
      });

      if (gradeSet.size > 1) {
        const { studentName, studentNumber, examId } = results[0];
        mixedGradeCases.push({
          key,
          studentName,
          studentNumber,
          examId,
          grades: Array.from(gradeSet).sort(),
          details: details.sort((a, b) => a.grade.localeCompare(b.grade))
        });
      }
    });

    // ----------------------------------------------------
    // [Case B] [NEW] 계정 분산 (Split Scores) 감지
    // ----------------------------------------------------
    const splitScoreCases: any[] = [];

    // 중복된 학생 그룹 순회
    Object.values(studentMap).forEach((students) => {
      if (students.length < 2) return; // 중복 아님

      // 이 그룹에 속한 학생들의 ID 목록
      const studentIds = students.map(s => s.id);
      
      // 이 학생들의 성적만 필터링
      const myResults = allResults.filter(r => studentIds.includes(r.studentId));
      if (myResults.length === 0) return; // 성적이 아예 없으면 패스

      // 시험 회차별로 성적이 어느 계정(studentId)에 있는지 확인
      const examMap: Record<string, Set<string>> = {}; // Key: examId, Value: Set<studentId>
      
      myResults.forEach(r => {
        if (!examMap[r.examId]) examMap[r.examId] = new Set();
        examMap[r.examId].add(r.studentId);
      });

      // 하나의 시험(examId)에 대해 2개 이상의 계정(studentId)이 사용되었다면 "분산"으로 간주
      const splitExams = Object.keys(examMap).filter(examId => examMap[examId].size > 1);

      if (splitExams.length > 0) {
        // 대표 계정 (가장 먼저 생성된 계정 혹은 성적이 많은 계정으로 병합 유도)
        // 여기서는 students 배열의 0번째를 Primary로 가정 (생성일 정렬 필요 시 클라이언트/API에서 처리)
        // API에서는 단순히 목록만 반환
        
        const details = myResults.map(r => ({
          id: r.id,
          examId: r.examId,
          subject: r.subjectName,
          score: r.totalScore,
          studentId: r.studentId, // 어느 계정에 붙어있는지
          createdAt: r.createdAt
        }));

        splitScoreCases.push({
          studentName: students[0].name,
          studentNumber: students[0].studentNumber,
          accounts: students, // 중복된 계정 정보들
          splitExams,         // 문제가 된 시험 회차들
          details             // 성적 상세
        });
      }
    });

    return NextResponse.json({ mixedGradeCases, splitScoreCases });

  } catch (error) {
    console.error("Anomaly Detection Error:", error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}