import { redirect } from 'next/navigation';

// This page exists only because Next.js requires a page.tsx for the (admin)
// route group. Authenticated admin traffic is redirected to /overview via
// the root page.tsx and middleware.
export default function AdminRootPage() {
  redirect('/overview');
}
