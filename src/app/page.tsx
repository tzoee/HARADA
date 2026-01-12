import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to app or auth based on session
  redirect('/app');
}
