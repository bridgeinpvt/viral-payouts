import { CreatorSidebar } from "@/components/layout/creator-sidebar";

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <CreatorSidebar />
      <main className="pt-14 lg:pt-0 lg:pl-[260px]">
        <div className="container mx-auto max-w-7xl p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
