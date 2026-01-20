"use client";
import styles from './ResultModal.module.css';
import ReportCard from './ReportCard';

interface ResultModalProps {
  // ReportCardProps와 동일한 타입 구조를 사용합니다.
  result: any; 
  onClose: () => void;
}

export default function ResultModal({ result, onClose }: ResultModalProps) {
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      {/* 모달 크기를 좀 더 키워줍니다 (max-width 관련 스타일은 ReportCard가 제어하므로 유연하게 둠) */}
      <div 
        className="bg-transparent relative" // 배경 투명하게, 스타일링은 ReportCard에 위임
        onClick={(e) => e.stopPropagation()}
        style={{ width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }} 
      >
        <button 
          className="absolute top-0 right-[-30px] text-white text-3xl font-bold z-50 hover:text-gray-300" 
          onClick={onClose}
        >
          &times;
        </button>
        
        {/* 리포트 카드 컴포넌트 삽입 */}
        <ReportCard result={result} />
      </div>
    </div>
  );
}