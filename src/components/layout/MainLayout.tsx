import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { FloatingChatButton } from "@/components/dashboard/FloatingChatButton";

interface MainLayoutProps {
  children: ReactNode;
  showFooter?: boolean;
  hideFooterCta?: boolean;
}

export function MainLayout({ children, showFooter = true, hideFooterCta = true }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Skip to main content - accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
      >
        Pular para o conteúdo principal
      </a>
      <Header />
      <main id="main-content" className="flex-1" role="main">
        {children}
      </main>
      {showFooter && <Footer hideCta={hideFooterCta} />}
      <FloatingChatButton />
    </div>
  );
}
