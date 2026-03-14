import AppChrome from '../../components/AppChrome';
import Script from 'next/script';
import './globals.css';

export const metadata = {
  title: 'SynapEscrow',
  description: 'SynapEscrow platform'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
