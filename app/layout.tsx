import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/components/CartProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

export const metadata: Metadata = {
  title: 'Peixoto Semi Joias | Elegância e Sofisticação',
  description: 'Semi joias com design autoral, banho de ouro 18k e prata 925 com garantia. Escolha suas peças e finalize seu pedido diretamente pelo WhatsApp.',
  keywords: 'semi joias, brincos, colares, anéis, pulseiras, banho de ouro 18k, prata 925, Peixoto Semi Joias',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <CartProvider>
          <Header />
          <CartDrawer />
          <main className="main-content">
            {children}
          </main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
