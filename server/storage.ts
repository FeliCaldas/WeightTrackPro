import {
  users,
  weightRecords,
  type User,
  type WeightRecord,
  type InsertUser,
  type InsertWeightRecord,
  type UpdateUser,
  type LoginData,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sum, count, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByCpf(cpf: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: UpdateUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getActiveUsers(): Promise<User[]>;
  validateUser(cpf: string, password: string): Promise<User | null>;
  
  // Weight record operations
  createWeightRecord(record: InsertWeightRecord): Promise<WeightRecord>;
  getUserWeightRecords(userId: number, startDate?: Date, endDate?: Date): Promise<WeightRecord[]>;
  getWeightRecordsByDate(date: Date): Promise<WeightRecord[]>;
  getAllWeightRecords(startDate?: Date, endDate?: Date): Promise<WeightRecord[]>;
  
  // Analytics
  getUserDailyStats(userId: number, date: Date): Promise<{
    totalWeight: number;
    recordCount: number;
    records: WeightRecord[];
  }>;
  
  getUserMonthlyStats(userId: number, year: number, month: number): Promise<{
    totalWeight: number;
    recordCount: number;
    dailyStats: Array<{
      date: string;
      weight: number;
      recordCount: number;
    }>;
  }>;
  
  getDashboardStats(): Promise<{
    totalToday: number;
    activeUsers: number;
    avgDaily: number;
    totalMonth: number;
  }>;

  getUserSummaryStats(userId: number): Promise<{
    totalToday: number;
    totalMonth: number;
    avgDaily: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByCpf(cpf: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.cpf, cpf));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: UpdateUser): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.firstName);
  }

  async getActiveUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.isActive, true), eq(users.isAdmin, false)))
      .orderBy(users.firstName);
  }

  async validateUser(cpf: string, password: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.cpf, cpf), eq(users.password, password), eq(users.isActive, true)));
    return user || null;
  }

  // Weight record operations
  async createWeightRecord(record: InsertWeightRecord): Promise<WeightRecord> {
    const [weightRecord] = await db
      .insert(weightRecords)
      .values({
        ...record,
        weight: record.weight.toString(),
      })
      .returning();
    return weightRecord;
  }

  async getUserWeightRecords(
    userId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<WeightRecord[]> {
    let whereConditions = [eq(weightRecords.userId, userId)];

    if (startDate && endDate) {
      whereConditions.push(
        gte(weightRecords.date, startDate.toISOString().split('T')[0]),
        lte(weightRecords.date, endDate.toISOString().split('T')[0])
      );
    }

    return await db
      .select()
      .from(weightRecords)
      .where(and(...whereConditions))
      .orderBy(desc(weightRecords.date), desc(weightRecords.createdAt));
  }

  async getWeightRecordsByDate(date: Date): Promise<WeightRecord[]> {
    return await db
      .select()
      .from(weightRecords)
      .where(eq(weightRecords.date, date.toISOString().split('T')[0]))
      .orderBy(desc(weightRecords.createdAt));
  }

  async getAllWeightRecords(startDate?: Date, endDate?: Date): Promise<WeightRecord[]> {
    if (startDate && endDate) {
      return await db
        .select()
        .from(weightRecords)
        .where(
          and(
            gte(weightRecords.date, startDate.toISOString().split('T')[0]),
            lte(weightRecords.date, endDate.toISOString().split('T')[0])
          )
        )
        .orderBy(desc(weightRecords.date), desc(weightRecords.createdAt));
    }

    return await db
      .select()
      .from(weightRecords)
      .orderBy(desc(weightRecords.date), desc(weightRecords.createdAt));
  }

  async getUserDailyStats(userId: number, date: Date): Promise<{
    totalWeight: number;
    recordCount: number;
    records: WeightRecord[];
  }> {
    const dateStr = date.toISOString().split('T')[0];
    
    const records = await db
      .select()
      .from(weightRecords)
      .where(
        and(
          eq(weightRecords.userId, userId),
          eq(weightRecords.date, dateStr)
        )
      )
      .orderBy(desc(weightRecords.createdAt));

    const totalWeight = records.reduce((sum, record) => sum + parseFloat(record.weight), 0);

    return {
      totalWeight,
      recordCount: records.length,
      records,
    };
  }

  async getUserMonthlyStats(userId: number, year: number, month: number): Promise<{
    totalWeight: number;
    recordCount: number;
    dailyStats: Array<{
      date: string;
      weight: number;
      recordCount: number;
    }>;
  }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const records = await this.getUserWeightRecords(userId, startDate, endDate);
    
    const dailyStats = records.reduce((acc, record) => {
      const date = record.date;
      if (!acc[date]) {
        acc[date] = { date, weight: 0, recordCount: 0 };
      }
      acc[date].weight += parseFloat(record.weight);
      acc[date].recordCount += 1;
      return acc;
    }, {} as Record<string, { date: string; weight: number; recordCount: number }>);

    const totalWeight = records.reduce((sum, record) => sum + parseFloat(record.weight), 0);

    return {
      totalWeight,
      recordCount: records.length,
      dailyStats: Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async getDashboardStats(): Promise<{
    totalToday: number;
    activeUsers: number;
    avgDaily: number;
    totalMonth: number;
  }> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get today's total
    const todayRecords = await db
      .select()
      .from(weightRecords)
      .where(eq(weightRecords.date, todayStr));
    
    const totalToday = todayRecords.reduce((sum, record) => sum + parseFloat(record.weight), 0);

    // Get active users count
    const activeUsersResult = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.isActive, true));
    
    const activeUsers = activeUsersResult[0]?.count || 0;

    // Get month's data for average calculation
    const monthRecords = await this.getAllWeightRecords(monthStart, monthEnd);
    const totalMonth = monthRecords.reduce((sum, record) => sum + parseFloat(record.weight), 0);
    
    const daysInMonth = monthEnd.getDate();
    const avgDaily = totalMonth / daysInMonth;

    return {
      totalToday,
      activeUsers,
      avgDaily,
      totalMonth,
    };
  }

  async getUserSummaryStats(userId: number): Promise<{
    totalToday: number;
    totalMonth: number;
    avgDaily: number;
  }> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get today's total for this user
    const todayRecords = await db
      .select()
      .from(weightRecords)
      .where(and(
        eq(weightRecords.userId, userId),
        eq(weightRecords.date, todayStr)
      ));
    
    const totalToday = todayRecords.reduce((sum, record) => sum + parseFloat(record.weight), 0);

    // Get month's data for this user
    const monthRecords = await this.getUserWeightRecords(userId, monthStart, monthEnd);
    const totalMonth = monthRecords.reduce((sum, record) => sum + parseFloat(record.weight), 0);
    
    const daysInMonth = monthEnd.getDate();
    const avgDaily = totalMonth / daysInMonth;

    return {
      totalToday,
      totalMonth,
      avgDaily,
    };
  }
}

export const storage = new DatabaseStorage();