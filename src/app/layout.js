import "./globals.css";
import { ToastProvider, PwaInstallPrompt } from "@/components";

export const viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata = {
  title: "OneHOA",
  description: "Homeowners Association Management System",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OneHOA",
  },
  icons: {
    icon: "/images/HOA_Logo.png",
    shortcut: "/images/HOA_Logo.png",
    apple: "/images/HOA_Logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div>
          {children}
        </div>
        <ToastProvider />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
