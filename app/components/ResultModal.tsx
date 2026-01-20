"use client";
import styles from './ResultModal.module.css';

interface ResultModalProps {
  result: {
    studentName: string;
    totalScore: number;
    subjectName: string;
    wrongQuestions: number[]; // 틀린 문제 번호 배열
  };
  onClose: () => void;
}

export default function ResultModal({ result, onClose }: ResultModalProps) {
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        
        <h2 className={styles.title}>채점 결과</h2>
        
        <div className={styles.scoreCard}>
          <p className={styles.name}>{result.studentName} 학생</p>
          <p className={styles.subject}>[{result.subjectName}]</p>
          <div className={styles.score}>{result.totalScore}점</div>
        </div>

        <div className={styles.wrongSection}>
          <h3>틀린 문제 번호</h3>
          {result.wrongQuestions.length > 0 ? (
            <div className={styles.wrongGrid}>
              {result.wrongQuestions.sort((a,b)=>a-b).map(qNum => (
                <span key={qNum} className={styles.wrongBadge}>{qNum}번</span>
              ))}
            </div>
          ) : (
            <p className={styles.perfectMsg}>축하합니다! 만점입니다 🎉</p>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.confirmBtn} onClick={onClose}>확인</button>
        </div>
      </div>
    </div>
  );
}