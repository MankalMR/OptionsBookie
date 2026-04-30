import { Suspense } from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import LandingPage from "@/components/home/LandingPage";
import Dashboard from "@/components/Dashboard";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <LandingPage />;
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 mt-4">Loading workspace...</span>
      </div>
    }>
      <Dashboard />
    </Suspense>
  );
}