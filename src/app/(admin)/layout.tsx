import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <main className="pt-14 lg:pt-0 lg:pl-[260px]">
        <div className="container mx-auto max-w-7xl p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
