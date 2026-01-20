"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menuItems = [
    { name: '📊 대시보드', path: '/admin' },
    { name: '👨‍🎓 학생별 리포트', path: '/admin/students' },
    { name: '📝 출제 관리', path: '/admin/exam-manager' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* 사이드바 (PC) / 상단바 (모바일) */}
      <aside className="bg-white w-full md:w-64 border-r border-gray-200 flex-shrink-0">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-extrabold text-blue-600 flex items-center gap-2">
            <span>🛡️</span> 관리자 모드
          </h1>
        </div>
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`block w-full text-left px-4 py-3 rounded-xl transition-all font-bold ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 mt-auto">
          <Link href="/" className="block w-full text-center px-4 py-2 border rounded-lg text-sm text-gray-500 hover:bg-gray-50">
            🏠 메인으로 나가기
          </Link>
        </div>
      </aside>

      {/* 메인 컨텐츠 영역 */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}