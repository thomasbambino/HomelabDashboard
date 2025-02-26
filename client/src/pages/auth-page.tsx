import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Redirect } from "wouter";
import { Loader2, User, Lock } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8">
          <h1 className="text-2xl font-semibold text-center mb-8">Login</h1>
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-6">
              <FormField
                control={loginForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <FormControl>
                        <Input className="pl-10" placeholder="Type your username" {...field} />
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
                        <Input type="password" className="pl-10" placeholder="Type your password" {...field} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <a href="#" className="text-sm text-muted-foreground hover:text-primary">
                  Forgot password?
                </a>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary/90 to-primary hover:from-primary hover:to-primary/90" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                LOGIN
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}