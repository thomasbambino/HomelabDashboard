import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationBar } from "@/components/navigation-bar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { CheckCircle, Trash2, AlertCircle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function TicketsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Only allow admin and superadmin to access this page
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return <div>Access denied</div>;
  }

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['/api/tickets'],
  });

  const completeTicketMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      const response = await fetch(`/api/tickets/${ticketId}/complete`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to complete ticket');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({
        title: "Success",
        description: "Ticket marked as completed",
      });
    },
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete ticket');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({
        title: "Success",
        description: "Ticket deleted successfully",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar pageTitle="Tickets" />

      <main className="container mx-auto px-4 pt-36 pb-6 space-y-6">
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Support Tickets</CardTitle>
            <CardDescription>Manage user support tickets and server requests</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div>Loading tickets...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket: any) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        {ticket.status === 'pending' ? (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </TableCell>
                      <TableCell>{ticket.subject}</TableCell>
                      <TableCell>{ticket.user?.username}</TableCell>
                      <TableCell>
                        {format(new Date(ticket.createdAt), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {ticket.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => completeTicketMutation.mutate(ticket.id)}
                            >
                              Complete
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteTicketMutation.mutate(ticket.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}