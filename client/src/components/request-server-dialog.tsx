import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import * as z from 'zod';

// List of supported games from the text file
const SUPPORTED_GAMES = [
  "Abiotic Factor",
  "Alien Swarm: Reactive Drop",
  "American Truck Simulator",
  "ARK: Survival Ascended",
  "ARK: Survival Evolved",
  "Arma 3",
  "Arma Reforger",
  "ASKA",
  "Assetto Corsa",
  "Assetto Corsa Competizione",
  "Astro Colony",
  "Astroneer",
  "Avorion",
  "Barotrauma",
  "BeamMP",
  "Beasts of Bermuda",
  "Black Mesa",
  "Blackwake",
  // Add more games as needed
].sort();

const requestServerSchema = z.object({
  game: z.string().min(1, "Please select a game"),
});

type RequestServerForm = z.infer<typeof requestServerSchema>;

export function RequestServerDialog() {
  const { toast } = useToast();
  const form = useForm<RequestServerForm>({
    resolver: zodResolver(requestServerSchema),
    defaultValues: {
      game: "",
    },
  });

  const onSubmit = (data: RequestServerForm) => {
    toast({
      title: "Server request submitted",
      description: `Your request for a ${data.game} server has been sent to the administrators.`,
    });
    form.reset();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Request Server
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request New Game Server</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="game"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Game</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a game" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SUPPORTED_GAMES.map((game) => (
                        <SelectItem key={game} value={game}>
                          {game}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Submit Request
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
