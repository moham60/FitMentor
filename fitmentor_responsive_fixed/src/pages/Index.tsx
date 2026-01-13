import { useState } from 'react';
import BottomNav from '@/components/layout/BottomNav';
import DashboardView from '@/components/dashboard/DashboardView';
import NutritionView from '@/components/nutrition/NutritionView';
import WorkoutView from '@/components/workout/WorkoutView';
import AIAssistantView from '@/components/ai/AIAssistantView';
import ProfileView from '@/components/profile/ProfileView';

const Index = () => {
  const [activeTab, setActiveTab] = useState('home');

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <DashboardView />;
      case 'nutrition':
        return <NutritionView />;
      case 'workout':
        return <WorkoutView />;
      case 'ai':
        return <AIAssistantView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-min-h-[100dvh] bg-background">
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 pt-4 sm:pt-6 pb-24">
        {renderContent()}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
