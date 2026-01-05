import { useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp, Target, Sparkles, Activity, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const WelcomePage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const features = [
    {
      icon: TrendingUp,
      title: 'Professional Training',
      description: 'Customized workouts with continuous progress tracking',
    },
    {
      icon: Target,
      title: 'Smart Nutrition Plans',
      description: 'Precise calorie and macro calculations based on your goal',
    },
    {
      icon: Sparkles,
      title: 'Smart AI Assistant',
      description: 'Instant answers and personalized advice 24/7',
    },
    {
      icon: Activity,
      title: 'Comprehensive Tracking',
      description: 'Monitor weight, measurements, and progress accurately',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4 lg:p-8">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-5 right-5 z-50 p-3 rounded-full bg-card border-2 border-border shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
      >
        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
        {/* Left Side - Auth Card */}
        <div className="w-full max-w-md">
          <div className="bg-card rounded-3xl p-8 lg:p-12 shadow-2xl animate-fade-in">
            <h2 className="text-3xl lg:text-4xl font-display font-bold text-center text-foreground mb-3">
              Start Your Journey
            </h2>
            <p className="text-muted-foreground text-center mb-8">
              Join thousands of users who achieved their goals
            </p>

            <div className="space-y-4">
              <Button
                onClick={() => navigate('/signup')}
                className="w-full h-14 bg-gradient-primary hover:opacity-90 text-primary-foreground text-base font-semibold rounded-xl shadow-glow transition-all"
              >
                <ArrowRight className="w-5 h-5 mr-2" />
                Create New Account
              </Button>

              <Button
                onClick={() => navigate('/signin')}
                variant="outline"
                className="w-full h-14 text-base font-semibold rounded-xl border-2"
              >
                I Already Have an Account
              </Button>
            </div>

            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground">Or continue with</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="flex gap-4">
              <Button variant="outline" className="flex-1 h-12 rounded-xl">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
              </Button>
              <Button variant="outline" className="flex-1 h-12 rounded-xl">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </Button>
              <Button variant="outline" className="flex-1 h-12 rounded-xl">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"/>
                  <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"/>
                  <path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z"/>
                  <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z"/>
                </svg>
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-8">
              By continuing, you agree to our{' '}
              <a href="#" className="text-primary hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-primary hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>

        {/* Right Side - Hero Content */}
        <div className="flex-1 text-center lg:text-left text-primary-foreground">
          {/* Logo */}
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-8">
            <div className="w-12 h-12 bg-primary-foreground/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Activity className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-3xl font-display font-bold">FitMintor</span>
          </div>

          <h1 className="text-4xl lg:text-6xl font-display font-bold mb-6">
            Transform Your Body
            <br />
            <span className="text-primary-foreground/90">with AI Power</span>
          </h1>
          <p className="text-lg lg:text-xl text-primary-foreground/80 mb-12 max-w-lg mx-auto lg:mx-0">
            Complete platform to achieve your fitness goals with AI support
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 hover:bg-primary-foreground/15 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-xs text-primary-foreground/70">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center lg:justify-start gap-12">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="w-5 h-5 fill-current" />
                <span className="text-3xl font-bold">4.9</span>
              </div>
              <p className="text-sm text-primary-foreground/70">User Rating</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">10K+</p>
              <p className="text-sm text-primary-foreground/70">Meals Logged</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">5K+</p>
              <p className="text-sm text-primary-foreground/70">Active Users</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
