"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CheckScorePage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', number: '' });
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.number.length !== 8) {
      alert("이름과 8자리 학생 번호를 정확히 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/find-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (data.found && data.studentId) {
        // 학생 ID를 찾으면 리포트 페이지로 이동
        router.push(`/report/${data.studentId}`);
      } else {
        alert("일치하는 학생 정보를 찾을 수 없습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">🎓 성적 조회</h1>
        <p className="text-gray-500 mb-8 text-sm">샤인 독서실 월례고사 결과 확인</p>

        <form onSubmit={handleSearch} className="flex flex-col gap-4 text-left">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">이름</label>
            <input 
              type="text" 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="홍길동"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">학생 번호</label>
            <input 
              type="text" 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="12345678"
              maxLength={8}
              value={form.number}
              onChange={e => setForm({...form, number: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition mt-4 disabled:bg-gray-400"
          >
            {loading ? '조회 중...' : '내 성적 보러가기'}
          </button>
        </form>
      </div>
    </div>
  );
}