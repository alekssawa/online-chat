import type { Request, Response, NextFunction } from "express";
import { GraphQLError } from "graphql";
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
      throw new GraphQLError("Refresh token required", {
        extensions: { code: "FORBIDDEN" },
      });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
    } catch {
      throw new GraphQLError("Invalid refresh token", {
        extensions: { code: "UNAUTHENTICATED" },
      });
    }

    // Проверяем, есть ли токен в БД
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken) {
      throw new GraphQLError("Refresh token revoked", {
        extensions: { code: "UNAUTHENTICATED" },
      });
    }

    // Присваиваем userId в объект запроса
    req.userId = decoded.userId;
    next();
  } catch (err) {
    // Если это GraphQLError, пробрасываем дальше
    if (err instanceof GraphQLError) throw err;

    // На всякий случай стандартная ошибка
    throw new GraphQLError("Refresh token error", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
};
