import "./globals.css";
import { ToastProvider } from "@/components";

export const metadata = {
  title: "OneHOA",
  description: "Homeowners Association Management System",
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
