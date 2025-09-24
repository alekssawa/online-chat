import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prismaClient.js";

export interface RefreshRequest extends Request {
  userId?: string; // userId добавляется после валидации
}

export const refreshMiddleware = async (
  req: RefreshRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token required" });
    }

    const decoded: any = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);

    // Проверяем, есть ли токен в БД
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken) {
      return res.status(401).json({ message: "Refresh token revoked" });
    }

    // Присваиваем userId в объект запроса
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};
