import { useState, useRef, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Sparkles, 
  Send, 
  Bot,
  User,
  Lightbulb,
  Dumbbell,
  Utensils,
  Target,
  Mic
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AIAssistantPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your AI fitness assistant. I can help you with workout plans, nutrition advice, goal setting, and tracking your progress. What would you like to know today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    {
      icon: Dumbbell,
      text: "Create a workout plan for muscle gain",
      category: "Workout"
    },
    {
      icon: Utensils,
      text: "What should I eat to lose weight?",
      category: "Nutrition"
    },
    {
      icon: Target,
      text: "How can I improve my bench press?",
      category: "Exercise"
    },
    {
      icon: Lightbulb,
      text: "Tips for staying motivated",
      category: "Motivation"
    },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getAIResponse(inputValue),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const getAIResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('workout') || lowerQuery.includes('exercise')) {
      return "Based on your goals, I recommend a 4-day split focusing on:\n\n**Day 1:** Push (Chest, Shoulders, Triceps)\n**Day 2:** Pull (Back, Biceps)\n**Day 3:** Rest\n**Day 4:** Legs (Quads, Hamstrings, Calves)\n**Day 5:** Upper Body (Full)\n\nWould you like me to create a detailed workout plan with specific exercises and sets?";
    }
    
    if (lowerQuery.includes('diet') || lowerQuery.includes('eat') || lowerQuery.includes('nutrition') || lowerQuery.includes('food')) {
      return "For your nutrition plan, I suggest:\n\n**Protein:** 1.6-2.2g per kg of body weight\n**Carbs:** 4-6g per kg (adjust based on activity)\n**Fats:** 0.8-1g per kg\n\n**Meal timing:**\n• Pre-workout: Complex carbs + protein (2hrs before)\n• Post-workout: Fast-digesting protein + carbs\n• Before bed: Casein protein or Greek yogurt\n\nShall I create a specific meal plan for you?";
    }
    
    if (lowerQuery.includes('weight') || lowerQuery.includes('lose') || lowerQuery.includes('gain')) {
      return "To reach your weight goals safely:\n\n**For weight loss:**\n• Aim for 0.5-1kg per week\n• Create a 500-750 calorie deficit\n• Prioritize protein to preserve muscle\n\n**For weight gain:**\n• Aim for 0.25-0.5kg per week\n• Surplus of 300-500 calories\n• Focus on progressive overload in training\n\nI can calculate your exact caloric needs if you'd like!";
    }
    
    return "That's a great question! Based on your fitness profile, I'd recommend focusing on consistency and progressive overload. Would you like me to provide more specific advice based on your current goals and training history?";
  };

  const handleSuggestionClick = (text: string) => {
    setInputValue(text);
  };

  return (
    <MainLayout 
      title="AI Assistant"
      subtitle="Your personal fitness coach"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* Chat Area */}
        <Card className="lg:col-span-8 flex flex-col">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-bold">FitMintor AI</p>
                <p className="text-xs text-muted-foreground font-normal">Powered by advanced AI</p>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] p-4 rounded-2xl",
                    message.role === 'user'
                      ? "bg-gradient-primary text-primary-foreground rounded-br-none"
                      : "bg-muted text-foreground rounded-bl-none"
                  )}
                >
                  <p className="whitespace-pre-line text-sm">{message.content}</p>
                  <p className={cn(
                    "text-[10px] mt-2",
                    message.role === 'user' ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted p-4 rounded-2xl rounded-bl-none">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Input Area */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-3">
              <Button variant="outline" size="icon" className="rounded-xl flex-shrink-0">
                <Mic className="w-5 h-5" />
              </Button>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything about fitness..."
                className="h-12 rounded-xl"
              />
              <Button 
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                className="bg-gradient-primary text-primary-foreground rounded-xl px-6 shadow-glow"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Suggestions Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(question.text)}
                  className="w-full p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <question.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-primary font-medium mb-1">{question.category}</p>
                    <p className="text-sm text-foreground">{question.text}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-warning" />
                AI Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>• Create personalized workout plans</p>
              <p>• Get nutrition and meal advice</p>
              <p>• Track and analyze your progress</p>
              <p>• Answer fitness questions 24/7</p>
              <p>• Provide exercise form tips</p>
              <p>• Suggest recovery strategies</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default AIAssistantPage;
