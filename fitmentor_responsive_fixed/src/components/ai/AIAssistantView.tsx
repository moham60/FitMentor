import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export default function AIAssistantZapierEmbed() {
  return (
    <MainLayout title="AI Assistant" subtitle="Your personal fitness coach">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        <Card className="lg:col-span-8 flex flex-col overflow-hidden">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-bold">FitMentor AI</p>
                <p className="text-xs text-muted-foreground font-normal">
                  Zapier Chatbot
                </p>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 flex-1">
            <iframe
              src="https://interfaces.zapier.com/embed/chatbot/cmk41tplu002tty0l910127td"
              title="FitMentor Chatbot"
              className="w-full h-full"
              style={{ borderStyle: 'none' }}
              allow="clipboard-write; microphone; camera"
            />
          </CardContent>
        </Card>

        {/* اختياري: سيب السايدبار بتاعك زي ما هو */}
        <div className="lg:col-span-4 space-y-6">
          {/* ...Your existing sidebar cards... */}
        </div>
      </div>
    </MainLayout>
  );
}
