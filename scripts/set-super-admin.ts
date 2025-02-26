import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcrypt";
import { z } from "zod";

const userSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
  email: z.string().email(),
});

async function setSuperAdmin(username: string, password: string, email: string) {
  try {
    // Validate input
    const userData = userSchema.parse({ username, password, email });
    
    // Hash the password
    const hashedPassword = await hash(password, 10);
    
    // Check if a superadmin already exists
    const existingSuperAdmin = await db.query.users.findFirst({
      where: eq(users.role, 'superadmin')
    });

    if (existingSuperAdmin) {
      // Update existing superadmin
      await db
        .update(users)
        .set({
          username: userData.username,
          password: hashedPassword,
          email: userData.email,
        })
        .where(eq(users.role, 'superadmin'));
      
      console.log('Super admin account updated successfully');
    } else {
      // Create new superadmin
      await db.insert(users).values({
        username: userData.username,
        password: hashedPassword,
        email: userData.email,
        role: 'superadmin',
        approved: true,
        enabled: true,
      });
      
      console.log('Super admin account created successfully');
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
    } else {
      console.error('Error setting super admin:', error);
    }
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 3) {
  console.log('Usage: npm run set-super-admin <username> <password> <email>');
  process.exit(1);
}

setSuperAdmin(args[0], args[1], args[2]);
