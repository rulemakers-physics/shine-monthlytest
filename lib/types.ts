export interface SubjectConfig {
  id: string;             // 예: high1_math
  grade: string;          // 고1, 고2, 고3
  subjectName: string;    // 국어, 수학, 영어, 통합과학
  type: 'simple' | 'integrated_science'; // 채점 방식
  
  questionCount: number;      // 문항 수
  startQuestionNumber: number;// 시작 번호 (영어 듣기 생략 시 18)
  
  answerKey: number[];        // 정답 배열
  scoreWeights: number[];     // 배점 배열
  
  // [NEW] 서술형(주관식) 여부 배열 (true면 주관식, false면 객관식)
  isSubjective: boolean[];    
  
  // 통합과학용 (선택)
  categories?: string[];      
}

export interface ExamInfo {
  id: string;     // 2026-03
  year: number;
  month: number;
  title: string;
  isActive: boolean;
}