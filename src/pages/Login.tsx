import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useStakeholderAuth } from "@/contexts/StakeholderAuthContext";
import { Loader2 } from "lucide-react";


export default function Login() {
  const [accessKey, setAccessKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { validateAndSetSession } = useStakeholderAuth();


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const trimmedKey = accessKey.trim();
    
    if (!trimmedKey) {
      toast({
        title: "Access Key Required",
        description: "Please enter your access key",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await validateAndSetSession(trimmedKey);
      
      if (result.success) {
        toast({
          title: "Access Granted",
          description: "Welcome to the compliance portal",
        });
        navigate("/");
      } else {
        toast({
          title: "Access Denied",
          description: result.error || "Invalid access key",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card border border-border rounded-lg">
        <div className="text-center space-y-4">
          <img src="/robomart-login-logo.png" alt="Robomart Logo" className="w-16 h-16 mx-auto" />
          <h1 className="text-2xl font-semibold">Robomart Petition</h1>
          <p className="text-sm text-muted-foreground">Enter your access key to continue</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="accessKey" className="text-sm font-medium">
              Access Key
            </label>
            <Input
              id="accessKey"
              type="text"
              placeholder="robo-xxxx-xxxx-xxxx"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value.toLowerCase())}
              className="w-full font-mono"
              required
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full relative overflow-hidden group" 
            disabled={isLoading}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              "Access Portal"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
