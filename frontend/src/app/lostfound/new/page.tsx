import { Suspense } from 'react';
import { LostFoundEditor } from '@/components/features/lost-found';
export default function Page() {
  return (
    <Suspense>
      <LostFoundEditor />
    </Suspense>
  );
}
