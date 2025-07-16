import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSession, isAuthenticated, isAdmin } from "./auth";
import { insertUserSchema, insertWeightRecordSchema, loginSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  setupSession(app);

  // Auth routes
  app.post('/api/login', async (req, res) => {
    try {
      const { cpf, password } = loginSchema.parse(req.body);
      const user = await storage.validateUser(cpf, password);
      
      if (!user) {
        return res.status(401).json({ message: "CPF ou senha inválidos" });
      }
      
      (req.session as any).userId = user.id;
      res.json(user);
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Erro no login" });
    }
  });

  app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logout successful" });
    });
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User routes
  app.get('/api/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/users/active', isAuthenticated, async (req: any, res) => {
    try {
      const users = await storage.getActiveUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching active users:", error);
      res.status(500).json({ message: "Failed to fetch active users" });
    }
  });

  // Public endpoint for user selection (no auth required)
  app.get('/api/users/public', async (req: any, res) => {
    try {
      const users = await storage.getActiveUsers();
      // Return only safe fields for public access
      const safeUsers = users.map((user: any) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        workType: user.workType,
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching public users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch('/api/users/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = await storage.updateUser(parseInt(id), updates);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Weight record routes
  app.post('/api/weight-records', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      console.log("Received weight record data:", req.body);
      
      // Validate required fields before parsing
      if (!req.body.userId || !req.body.weight || !req.body.date) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: [{ message: "Missing required fields: userId, weight, date" }] 
        });
      }

      // Get user to determine workType
      const user = await storage.getUser(parseInt(req.body.userId));
      if (!user) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: [{ message: "User not found" }] 
        });
      }

      const data = insertWeightRecordSchema.parse({
        ...req.body,
        userId: parseInt(req.body.userId),
        weight: parseFloat(req.body.weight),
        workType: user.workType, // Use workType from user profile
        createdBy: (req.session as any).userId,
      });
      
      console.log("Parsed data:", data);
      const record = await storage.createWeightRecord(data);
      res.json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating weight record:", error);
      res.status(500).json({ message: "Failed to create weight record" });
    }
  });

  app.get('/api/weight-records/user/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;
      
      // Users can only access their own records unless they're admin
      const currentUserId = (req.session as any).userId;
      const currentUser = await storage.getUser(currentUserId);
      
      if (parseInt(userId) !== currentUserId && !currentUser?.isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const records = await storage.getUserWeightRecords(parseInt(userId), start, end);
      res.json(records);
    } catch (error) {
      console.error("Error fetching weight records:", error);
      res.status(500).json({ message: "Failed to fetch weight records" });
    }
  });

  app.get('/api/weight-records/daily/:userId/:date', isAuthenticated, async (req: any, res) => {
    try {
      const { userId, date } = req.params;
      
      // Users can only access their own records unless they're admin
      const currentUserId = (req.session as any).userId;
      const currentUser = await storage.getUser(currentUserId);
      
      if (parseInt(userId) !== currentUserId && !currentUser?.isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      const stats = await storage.getUserDailyStats(parseInt(userId), new Date(date));
      res.json(stats);
    } catch (error) {
      console.error("Error fetching daily stats:", error);
      res.status(500).json({ message: "Failed to fetch daily stats" });
    }
  });

  app.get('/api/weight-records/monthly/:userId/:year/:month', isAuthenticated, async (req: any, res) => {
    try {
      const { userId, year, month } = req.params;
      
      // Users can only access their own records unless they're admin
      const currentUserId = (req.session as any).userId;
      const currentUser = await storage.getUser(currentUserId);
      
      if (parseInt(userId) !== currentUserId && !currentUser?.isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      const stats = await storage.getUserMonthlyStats(parseInt(userId), parseInt(year), parseInt(month));
      res.json(stats);
    } catch (error) {
      console.error("Error fetching monthly stats:", error);
      res.status(500).json({ message: "Failed to fetch monthly stats" });
    }
  });

  app.get('/api/dashboard/stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // User summary stats route
  app.get('/api/users/:userId/summary', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      // Users can only access their own stats unless they're admin
      const currentUserId = (req.session as any).userId;
      const currentUser = await storage.getUser(currentUserId);
      
      if (parseInt(userId) !== currentUserId && !currentUser?.isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      const stats = await storage.getUserSummaryStats(parseInt(userId));
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user summary stats:", error);
      res.status(500).json({ message: "Failed to fetch user summary stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}