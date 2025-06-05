import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { RoleScopeProvider } from "@/contexts/RoleScopeContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VDT CV Management System",
  description: "Manage employee CVs efficiently",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="mdl-js">
      <body className={inter.className}>
        <LoadingProvider>
          <AuthProvider>
            <RoleScopeProvider>
              <NotificationProvider>
                {children}
                <Toaster
                  position="bottom-right"
                  richColors
                  closeButton
                  duration={4000}
                />
              </NotificationProvider>
            </RoleScopeProvider>
          </AuthProvider>
        </LoadingProvider>
      </body>
    </html>
  );
}
