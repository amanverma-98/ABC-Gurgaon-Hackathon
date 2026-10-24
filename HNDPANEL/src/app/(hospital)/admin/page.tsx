'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/doctors');
  }, [router]);

  return (
    <div className="h-full w-full flex items-center justify-center p-12 text-xs text-slate-400">
      <div className="flex items-center gap-2">
        <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-teal-600 border-t-transparent" />
        <span>Loading Doctor Roster & OPD Control...</span>
      </div>
    </div>
  );
}
