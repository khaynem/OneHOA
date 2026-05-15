import "./globals.css";
import { ToastProvider } from "@/components";

export const metadata = {
  title: "OneHOA",
  description: "Homeowners Association Management System",
  icons: {
    icon: "/images/HOA%20Logo.png",
    shortcut: "/images/HOA%20Logo.png",
    apple: "/images/HOA%20Logo.png",
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
      </body>
    </html>
  );
}
