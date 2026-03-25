import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../store';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

function ElektronikMediaLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="40 330 930 345"
      className={className}
      aria-label="Electronikmedia"
    >
      <defs>
        <linearGradient id="em-lg0" x1="-4589.3" y1="700.2" x2="-4584.2" y2="700.2" gradientTransform="translate(135675.6 16854.3) scale(29.4 -23.4)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff6800" />
          <stop offset="1" stopColor="#ffe04f" />
        </linearGradient>
        <linearGradient id="em-lg1" x1="-4547" y1="691.4" x2="-4541.2" y2="691.4" gradientTransform="translate(107279.8 11876.6) scale(23.5 -16.5)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff6800" />
          <stop offset="1" stopColor="#ffcd00" />
        </linearGradient>
        <linearGradient id="em-lg2" x1="-4594.8" y1="700.2" x2="-4588.6" y2="700.2" gradientTransform="translate(136126.9 16854.3) scale(29.5 -23.4)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff6800" />
          <stop offset="1" stopColor="#ffb700" />
        </linearGradient>
        <linearGradient id="em-lg3" x1="296.8" y1="522.5" x2="419.9" y2="410.1" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fc4a1f" />
          <stop offset="1" stopColor="#ffb700" />
        </linearGradient>
        <linearGradient id="em-lg4" x1="143.5" y1="340.1" x2="645.9" y2="630.9" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fc4a1f" />
          <stop offset="1" stopColor="#4f1c08" />
        </linearGradient>
      </defs>
      {/* E mark */}
      <path fill="url(#em-lg0)" d="M603.1,424.5c15.5,0,29.5,26.8,45.9,49.9,35.7,45.8,46.5,65.9,59.7,65.9s18.9-13.8,39.7-56.6c0,0-26,39.6-56.5,8.3-35.4-36.3-44.6-63.8-64.3-82.5,0,0-40.2,15.2-24.7,15.1Z" />
      <path fill="url(#em-lg1)" d="M502.2,502.2c13.8-11.1,44.2-42,56.9-54.4,15.8-16.1,40.1-43.1,51.2-43.7,11.1-.6,15.2.6,29.5,18.8,0,0-30.3-11.4-46.1,10.8,0,0-25.1,35-38.1,54-5.8,8.5-14.1,14.9-23.8,18-10.3,3.3-22.8,4.9-29.5-3.5Z" />
      <path fill="url(#em-lg2)" d="M418.2,426.1s13.7-6.6,42.8,30.8c35.7,45.8,48.3,83.1,66.9,83.1s47-91.2,75.6-115.4c0,0-3.3.8-16.4,14.5-13.7,14.4-43.3,64.9-58.7,64.7-9.5-.1-21.4-17.5-31.9-31.5-30.5-40.5-35.3-48.4-50-62.6,0,0-24.4,2.9-28.3,16.5Z" />
      <path fill="url(#em-lg3)" d="M277.7,515.7s-9.5-11.9,2.4-11.9c0,0,25.6,15.3,103.5-71.3,0,0,29.3-31.2,44.5-29.5,10.6-.4,17.1,3.9,25.5,13.7-15.2-1-30.7,4.3-41.8,14.7-20.1,16-39.3,46.8-66.1,75.8,0,0-7.1,20.4-47.1,27.3,0,0-11.3-1.7-20.8-18.7Z" />
      <path fill="url(#em-lg4)" d="M420.1,424.9c-21.1,13.4-47.8,54.4-58,68-15.7,20.1-24.3,31.6-37.5,39-28.1,15.8-52.6,8.1-63.4-31-16.8-61.5.6-129,49.5-156.4,24.6-13.8,42-3.2,47.6,17.5,6.1,22.4-1.2,49.8-19.2,71.8-16,18.9-35.8,34.1-58.3,44.5.7,4.9,1.7,9.8,3,14.5,6.3,25.2,19.5,30.8,35.5,25.8,7.2-2.3,13.7-6.4,19.1-11.8,16.3-16.3,51.6-56.3,57.3-62.4,12-12.7,24.3-19.5,24.3-19.5ZM307.5,356.3c-21.5,12.1-32,61.6-27.4,113.6,16-7.4,29.7-19,39.6-33.6,12.6-17,18.9-40.8,13.4-60.6-4.3-15.5-12.9-26.5-25.7-19.3Z" />
      {/* electronikmedia text */}
      <path fill="#231f20" d="M46.8,634.4v-.8c0-16.2,10.4-27.5,25.2-27.5s24.1,7.5,24.1,26.7v2.8h-40.5c.4,12.2,6.3,19,17.3,19s13.1-3.1,14.3-9.3h8.5c-1.8,10.8-10.8,16.4-22.9,16.4s-26-10.7-26-27.2ZM87.4,628.7c-.8-11.1-6.6-15.5-15.4-15.5s-14.6,6-16,15.5h31.4Z" />
      <path fill="#231f20" d="M119.6,581.3h8.6v79.4h-8.6v-79.4Z" />
      <path fill="#231f20" d="M152,634.4v-.8c0-16.2,10.4-27.5,25.2-27.5s24.1,7.5,24.1,26.7v2.8h-40.5c.4,12.2,6.3,19,17.3,19s13.1-3.1,14.3-9.3h8.5c-1.8,10.8-10.8,16.4-22.9,16.4s-26-10.7-26-27.2ZM192.5,628.7c-.8-11.1-6.6-15.5-15.4-15.5s-14.6,6-16,15.5h31.4Z" />
      <path fill="#231f20" d="M220.6,634.4v-.8c0-16.4,11.7-27.5,26.1-27.5s21.7,5.1,23.3,18.8h-8.4c-1.3-8.5-7.5-11.7-14.9-11.7s-17.3,7.8-17.3,20.4v.8c0,13.1,7.2,20.1,17.6,20.1s14.5-4.4,15.4-13.1h7.9c-1.1,11.6-10.5,20.2-23.4,20.2s-26.3-10.6-26.3-27.2Z" />
      <path fill="#231f20" d="M295.2,647.3v-33.1h-7.7v-7.2h7.7v-12.2h8.5v12.2h12.5v7.2h-12.5v32.2c0,5.2,2.4,7.8,6.7,7.8s4.7-.4,6.6-1.1v7.2c-1.7.6-3.8,1.1-7.3,1.1-9.8,0-14.5-5.8-14.5-14.2Z" />
      <path fill="#231f20" d="M340.1,607h8.5v9.7c3.4-6.1,8-10.3,17.7-10.6v8c-10.8.5-17.7,3.9-17.7,17.1v29.5h-8.5v-53.7Z" />
      <path fill="#231f20" d="M383.4,634.3v-.8c0-16.1,11.2-27.4,26.4-27.4s26.4,11.2,26.4,27.3v.8c0,16.2-11.2,27.4-26.5,27.4s-26.3-11.6-26.3-27.3ZM427.4,634.3v-.7c0-12.4-6.9-20.4-17.6-20.4s-17.6,8-17.6,20.3v.8c0,12.2,6.7,20.2,17.6,20.2s17.6-8.1,17.6-20.2Z" />
      <path fill="#231f20" d="M459.7,607h8.5v8.5c2.5-5,8.4-9.4,17.3-9.4s18.9,6.1,18.9,21.7v33h-8.5v-33.6c0-9.4-4-13.7-12.6-13.7s-15,5-15,14.7v32.6h-8.5v-53.7Z" />
      <path fill="#231f20" d="M530,590.2c0-3.1,2.6-5.6,5.6-5.6s5.6,2.6,5.6,5.6-2.6,5.6-5.6,5.6-5.6-2.6-5.6-5.6ZM531.6,607h8.5v53.7h-8.5v-53.7Z" />
      <path fill="#231f20" d="M567.8,581.3h8.5v50.4l22.3-24.7h10l-23,25,25,28.8h-10.4l-23.8-27.8v27.8h-8.5v-79.4Z" />
      <path fill="#231f20" d="M631.1,607h8.5v8.2c2.5-5,8.3-9.1,16-9.1s12.9,2.9,15.7,10.1c3.7-7,11.7-10.1,18.4-10.1,9.7,0,18.1,5.8,18.1,21.4v33.3h-8.5v-33.9c0-9.4-4-13.3-11.4-13.3s-14.2,4.7-14.2,14.4v32.9h-8.5v-33.9c0-9.4-4-13.3-11.4-13.3s-14.2,4.7-14.2,14.4v32.9h-8.5v-53.7Z" />
      <path fill="#231f20" d="M730.8,634.4v-.8c0-16.2,10.4-27.5,25.2-27.5s24.1,7.5,24.1,26.7v2.8h-40.5c.4,12.2,6.3,19,17.3,19s13.1-3.1,14.3-9.3h8.5c-1.8,10.8-10.8,16.4-22.9,16.4s-26-10.7-26-27.2ZM771.3,628.7c-.8-11.1-6.6-15.5-15.4-15.5s-14.6,6-16,15.5h31.4Z" />
      <path fill="#231f20" d="M799.3,634.9v-.8c0-16.4,10.3-28,25.1-28s14.5,4.3,17.6,9.6v-34.3h8.5v79.4h-8.5v-9.2c-3.1,5.2-10.6,10.2-18.4,10.2-14.1,0-24.2-10-24.2-26.7ZM842.3,634.2v-.8c0-13.8-6.6-20.2-17-20.2s-17,7.5-17,20.5v.8c0,13.6,7.3,20,16.3,20s17.8-6.6,17.8-20.3Z" />
      <path fill="#231f20" d="M876.7,590.2c0-3.1,2.6-5.6,5.6-5.6s5.6,2.6,5.6,5.6-2.6,5.6-5.6,5.6-5.6-2.6-5.6-5.6ZM878.2,607h8.5v53.7h-8.5v-53.7Z" />
      <path fill="#231f20" d="M910,645.8c0-12.4,13.1-16.6,26.9-16.6h7.7v-3.9c0-8.5-3.3-12.1-11.5-12.1s-11.5,3.1-12.3,9.7h-8.5c1.1-12.2,10.9-16.7,21.3-16.7s19.6,4.2,19.6,19.2v35.4h-8.5v-6.8c-4,5-8.8,7.7-16.7,7.7s-17.9-4.8-17.9-15.8ZM944.6,641.9v-6.7h-7.4c-10.8,0-18.7,2.7-18.7,10.6s2.7,9,10.2,9,15.9-4.6,15.9-12.9Z" />
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { signInWithEmail, signInWithGoogle, signUp, user } = useAuthStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Redirect if already logged in (must be in useEffect, not during render)
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Don't render the form if already authenticated
  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, name);
        toast.success('Account created successfully!');
      } else {
        await signInWithEmail(email, password);
        toast.success('Signed in successfully!');
      }
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Auth error:', err);
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google auth error:', err);
      toast.error(err.message || 'Google sign-in failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center gap-3 mb-4">
            <ElektronikMediaLogo className="w-56 h-auto" />
            <span className="text-xl font-bold tracking-tight">EM Make</span>
          </div>
          <p className="text-muted-foreground mt-1">
            {isSignUp ? 'Create your account' : 'Sign in to your workspace'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          {/* Google button */}
          <Button
            variant="outline"
            className="w-full h-11 mb-4"
            onClick={handleGoogleSignIn}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 text-muted-foreground">or continue with email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          {/* Toggle */}
          <p className="text-center text-sm text-muted-foreground mt-5">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              className="text-primary font-medium hover:underline"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}