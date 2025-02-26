import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Redirect } from "wouter";
import { Loader2, ServerCog } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Settings } from "@shared/schema";
import * as z from 'zod';

const requestResetSchema = z.object({
  identifier: z.string().min(1, "Username or email is required"),
});

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const loginForm = useForm({
    resolver: zodResolver(insertUserSchema.pick({ username: true, password: true })),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema.pick({ username: true, password: true, email: true })),
    defaultValues: {
      username: "",
      password: "",
      email: ""
    }
  });

  const resetForm = useForm({
    resolver: zodResolver(requestResetSchema),
    defaultValues: {
      identifier: ""
    }
  });

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome to {settings?.site_title || "Homelab Dashboard"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}>
                <div className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username or Email</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                    {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Login
                  </Button>

                  <div className="space-y-2 text-center">
                    <button 
                      type="button"
                      onClick={() => {
                        fetch('/api/request-reset', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ identifier: loginForm.getValues().username })
                        });
                      }}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      Forgot password?
                    </button>
                    <div className="text-sm text-muted-foreground">
                      Don't have an account?{" "}
                      <button
                        type="button"
                        onClick={() => registerMutation.mutate(registerForm.getValues())}
                        className="font-medium text-primary hover:underline"
                      >
                        Sign up
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:flex flex-col items-center justify-center p-8 bg-black">
        {settings?.logo_url_large ? (
          <img
            src={settings.logo_url_large}
            alt="Site Logo"
            className="h-20 w-20 mb-4 object-contain"
          />
        ) : (
          <ServerCog className="h-20 w-20 mb-4 text-primary" />
        )}
        <h2 className="text-2xl font-bold mb-2 text-white">{settings?.site_title || "Homelab Dashboard"}</h2>
        <p className="text-center text-gray-300 max-w-md">
          {settings?.login_description || "Monitor your services and game servers in real-time with our comprehensive dashboard."}
        </p>
      </div>
    </div>
  );
}