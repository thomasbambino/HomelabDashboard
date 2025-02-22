import { Service, GameServer, User, InsertUser } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllServices(): Promise<Service[]>;
  getAllGameServers(): Promise<GameServer[]>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private services: Map<number, Service>;
  private gameServers: Map<number, GameServer>;
  sessionStore: session.Store;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.services = new Map();
    this.gameServers = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Add some sample data
    this.services.set(1, {
      id: 1,
      name: "Plex Media Server",
      url: "http://plex.local:32400",
      status: true,
      lastChecked: new Date().toISOString(),
    });

    this.gameServers.set(1, {
      id: 1,
      name: "Minecraft Server",
      host: "mc.local",
      port: 25565,
      type: "minecraft",
      status: true,
      playerCount: 5,
      maxPlayers: 20,
      info: { version: "1.19.2" },
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }

  async getAllGameServers(): Promise<GameServer[]> {
    return Array.from(this.gameServers.values());
  }
}

export const storage = new MemStorage();
