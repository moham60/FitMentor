import { ReactNode } from 'react';
import AppSidebar from './AppSidebar';
import Header from './Header';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const MainLayout = ({ children, title, subtitle }: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="lg:ml-[280px] min-h-screen flex flex-col">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
