import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Redirect, useLocation } from "wouter";
import { Loader2, ServerCog } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Settings } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const searchParams = new URLSearchParams(window.location.search);
  const showNewPasswordForm = searchParams.get('action') === 'change_password' || loginMutation.error?.message?.includes("PASSWORD_CHANGE_REQUIRED");

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

  const resetPasswordForm = useForm({
    resolver: zodResolver(insertUserSchema.pick({ email: true })),
    defaultValues: {
      email: ""
    }
  });

  const newPasswordForm = useForm({
    resolver: zodResolver(insertUserSchema.pick({ password: true })),
    defaultValues: {
      password: ""
    }
  });

  const requestResetMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await apiRequest("POST", "/api/request-reset", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Reset link sent",
        description: "If an account exists with this email, a reset link will be sent.",
      });
      setShowPasswordReset(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to request reset",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { password: string }) => {
      const res = await apiRequest("POST", "/api/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      loginForm.reset();
      loginMutation.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to change password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogin = async (data: any) => {
    try {
      await loginMutation.mutateAsync(data);
    } catch (error: any) {
      const errorData = error.message && typeof error.message === 'string' && error.message.includes('{') 
        ? JSON.parse(error.message)
        : { message: error.message };

      if (errorData.code === "PASSWORD_CHANGE_REQUIRED") {
        toast({
          title: "Password change required",
          description: "Please set a new password to continue.",
        });
      } else {
        toast({
          title: "Login failed",
          description: errorData.message,
          variant: "destructive",
        });
      }
    }
  };

  if (user && !user.temp_password) {
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
            {showNewPasswordForm ? (
              <Form {...newPasswordForm}>
                <form onSubmit={newPasswordForm.handleSubmit((data) => changePasswordMutation.mutate(data))}>
                  <div className="space-y-4">
                    <FormField
                      control={newPasswordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={changePasswordMutation.isPending}>
                      {changePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Change Password
                    </Button>
                  </div>
                </form>
              </Form>
            ) : showPasswordReset ? (
              <Form {...resetPasswordForm}>
                <form onSubmit={resetPasswordForm.handleSubmit((data) => requestResetMutation.mutate(data))}>
                  <div className="space-y-4">
                    <FormField
                      control={resetPasswordForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={requestResetMutation.isPending}>
                        {requestResetMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Reset Link
                      </Button>
                      <Button variant="outline" onClick={() => setShowPasswordReset(false)}>
                        Back to Login
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            ) : (
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(handleLogin)}>
                      <div className="space-y-4">
                        <FormField
                          control={loginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
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
                        <Button variant="ghost" className="w-full" onClick={() => setShowPasswordReset(true)}>
                          Forgot Password?
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))}>
                      <div className="space-y-4">
                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
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
                        <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                          {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Register
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:flex flex-col items-center justify-center p-8 bg-primary/5">
        {settings?.logo_url_large ? (
          <img
            src={settings.logo_url_large}
            alt="Site Logo"
            className="h-20 w-20 mb-4 object-contain"
          />
        ) : (
          <ServerCog className="h-20 w-20 mb-4 text-primary" />
        )}
        <h2 className="text-2xl font-bold mb-2">{settings?.site_title || "Homelab Dashboard"}</h2>
        <p className="text-center text-muted-foreground max-w-md">
          {settings?.login_description || "Monitor your services and game servers in real-time with our comprehensive dashboard. Track status, player counts, and get quick access to all your homelab resources."}
        </p>
      </div>
    </div>
  );
}