import './globals.css';

export const metadata = {
  title: 'AquaGuard — River Garbage Detection',
  description: 'Real-time river garbage detection and drowning risk assessment',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
