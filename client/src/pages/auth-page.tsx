import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Redirect } from "wouter";
import { Loader2, User, Mail, Lock } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation } = useAuth();

  const loginForm = useForm({
    resolver: zodResolver(insertUserSchema.pick({ username: true, password: true })),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-6">
          <h1 className="text-2xl font-semibold">Member Login</h1>
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <FormControl>
                        <Input className="pl-10 bg-gray-100" placeholder="Email" {...field} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <FormControl>
                        <Input type="password" className="pl-10 bg-gray-100" placeholder="Password" {...field} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full bg-[#98C23C] hover:bg-[#88B22C]" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                LOGIN
              </Button>
            </form>
          </Form>
          <div className="space-y-2 text-center">
            <a href="#" className="text-sm text-gray-500 hover:text-gray-700 block">
              Forgot Username / Password?
            </a>
            <a href="#" className="text-sm text-gray-500 hover:text-gray-700 block">
              Create your Account →
            </a>
          </div>
        </div>
      </div>

      {/* Right Column - Logo and Text */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-8">
        <div className="h-32 w-32 bg-white rounded-full flex items-center justify-center mb-8">
          <User className="h-16 w-16 text-gray-400" />
        </div>
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Welcome Back!</h2>
          <p className="max-w-md text-white/80">
            Log in to access your dashboard and manage your homelab services
          </p>
        </div>
      </div>
    </div>
  );
}