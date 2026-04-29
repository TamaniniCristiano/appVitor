import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vitor Rafael • A festa galáctica de 6 anos',
  description:
    'A galáxia espera por você. Vitor Rafael está fazendo 6 anos — venha celebrar nessa aventura Super Mario, dia 07 de junho de 2026, a partir das 15h.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0B0E2C',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://assets.nintendo.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
