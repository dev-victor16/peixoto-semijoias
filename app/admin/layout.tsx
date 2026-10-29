import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Painel Administrativo | Peixoto Semi Joias',
  robots: 'noindex, nofollow',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-wrapper">
      {children}
    </div>
  );
}
