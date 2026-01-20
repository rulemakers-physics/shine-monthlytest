"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import Link from 'next/link';

export default function AdminStudentList() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // 이름순 정렬
        const q = query(collection(db, "students"), orderBy("name"));
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStudents(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // 검색 필터링
  const filteredStudents = students.filter((s: any) => 
    s.name.includes(searchTerm) || s.studentNumber.includes(searchTerm)
  );

  return (
    <div className="max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">👨‍🎓 학생별 성적 리포트 관리</h2>
        
        {/* 검색창 */}
        <div className="relative w-full md:w-80">
          <input 
            type="text" 
            placeholder="이름 또는 학생번호 검색..." 
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
        </div>
      </header>

      {/* 학생 목록 테이블 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">학생 이름</th>
                <th className="p-4 font-semibold">학생 번호</th>
                <th className="p-4 font-semibold text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={3} className="p-8 text-center text-gray-400">로딩 중...</td></tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student: any) => (
                  <tr key={student.id} className="hover:bg-blue-50 transition-colors group">
                    <td className="p-4 font-bold text-gray-800">{student.name}</td>
                    <td className="p-4 text-gray-500 font-mono">{student.studentNumber}</td>
                    <td className="p-4 text-right">
                      <Link 
                        href={`/report/${student.id}`} 
                        className="inline-block bg-white border border-gray-200 text-blue-600 font-bold px-4 py-2 rounded-lg text-sm hover:bg-blue-600 hover:text-white transition shadow-sm"
                      >
                        📄 성적표 보기
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3} className="p-8 text-center text-gray-400">검색 결과가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}