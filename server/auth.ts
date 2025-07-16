import session from "express-session";
import { Express } from "express";
import { storage } from "./storage";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export function setupSession(app: Express) {
  const sessionStore = new PostgresSessionStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    tableName: "sessions",
  });

  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  if (!(req.session as any).userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export const isAdmin = async (req: any, res: any, next: any) => {
  if (!(req.session as any).userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUser((req.session as any).userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  next();
};