# Settings Dialog Comparison - AMP Configuration Section

## 1. AMP Tab Structure and Visibility

### Previous Version (Not Present):
No dedicated AMP tab existed in the previous version.

### New Version:
```tsx
{isSuperAdmin && (
  <TabsTrigger value="amp" className="flex-1">AMP</TabsTrigger>
)}

<TabsContent value="amp">
  <Form {...ampForm}>
    <form onSubmit={ampForm.handleSubmit((data) => updateAMPCredentialsMutation.mutate(data))} className="space-y-4">
      // AMP configuration fields here
    </form>
  </Form>
</TabsContent>
```

## 2. AMP Form Implementation

### New Version's Key Features:
```tsx
// 1. Separate form state for AMP settings
const ampForm = useForm({
  defaultValues: {
    amp_url: "",
    amp_username: "",
    amp_password: "",
  },
});

// 2. Dedicated mutation for AMP credentials
const updateAMPCredentialsMutation = useMutation({
  mutationFn: async (data: { amp_url: string; amp_username: string; amp_password: string }) => {
    const res = await apiRequest("POST", "/api/update-amp-credentials", data);
    return res.json();
  },
  onSuccess: () => {
    toast({
      title: "AMP Credentials Updated",
      description: "Your AMP credentials have been updated successfully.",
    });
  },
  onError: (error: Error) => {
    toast({
      title: "Failed to update AMP credentials",
      description: error.message,
      variant: "destructive",
    });
  },
});
```

## 3. AMP Connection Testing

### New Version Added:
```tsx
// Test connection function
const testAMPConnection = async () => {
  try {
    setIsTestingConnection(true);
    const res = await apiRequest("GET", "/api/amp-test");
    const data = await res.json();

    if (data.success) {
      toast({
        title: "Connection Successful",
        description: `Connected to AMP. Found ${data.instanceCount} instances.`,
      });
    } else {
      toast({
        title: "Connection Failed",
        description: data.message || "Could not connect to AMP server.",
        variant: "destructive",
      });
    }
  } catch (error) {
    toast({
      title: "Connection Test Failed",
      description: error instanceof Error ? error.message : "An unknown error occurred",
      variant: "destructive",
    });
  } finally {
    setIsTestingConnection(false);
  }
};
```

## 4. AMP Input Fields

### New Version's Implementation:
```tsx
<FormField
  control={ampForm.control}
  name="amp_url"
  render={({ field }) => (
    <FormItem>
      <FormLabel>AMP Server URL</FormLabel>
      <FormControl>
        <Input
          placeholder="https://your-amp-server.com"
          {...field}
        />
      </FormControl>
    </FormItem>
  )}
/>
<FormField
  control={ampForm.control}
  name="amp_username"
  render={({ field }) => (
    <FormItem>
      <FormLabel>AMP Username</FormLabel>
      <FormControl>
        <Input
          placeholder="AMP admin username"
          {...field}
        />
      </FormControl>
    </FormItem>
  )}
/>
<FormField
  control={ampForm.control}
  name="amp_password"
  render={({ field }) => (
    <FormItem>
      <FormLabel>AMP Password</FormLabel>
      <FormControl>
        <Input
          type="password"
          placeholder="AMP admin password"
          {...field}
        />
      </FormControl>
    </FormItem>
  )}
/>
```

## 5. Action Buttons

### New Version Added:
```tsx
<div className="flex gap-2">
  <Button
    type="submit"
    className="flex-1"
    disabled={updateAMPCredentialsMutation.isPending}
  >
    {updateAMPCredentialsMutation.isPending && (
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    )}
    Save Credentials
  </Button>
  <Button
    type="button"
    variant="outline"
    onClick={testAMPConnection}
    disabled={isTestingConnection}
  >
    {isTestingConnection ? (
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    ) : (
      <RefreshCw className="mr-2 h-4 w-4" />
    )}
    Test Connection
  </Button>
</div>
```

## Key Improvements:
1. **Dedicated AMP Section**: The new version has a separate tab for AMP configuration, making it easier to manage AMP-specific settings.
2. **Form Handling**: Uses react-hook-form for better form state management and validation.
3. **Connection Testing**: Added a test connection feature with clear feedback.
4. **Loading States**: Visual feedback during operations with loading spinners.
5. **Error Handling**: Comprehensive error handling with toast notifications.
6. **Security**: Password field is properly masked.
7. **TypeScript Integration**: Proper type definitions for form data and API responses.
