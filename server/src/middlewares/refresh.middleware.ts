import { GraphQLError } from "graphql";
import jwt from "jsonwebtoken";
import prisma from "../lib/prismaClient.js";

/**
 * Проверяет refresh token и возвращает userId.
 * @param token JWT refresh token
 * @returns userId
 * @throws GraphQLError с кодом UNAUTHENTICATED, если токен отсутствует, недействителен или отозван
 */

export interface RefreshRequest extends Request {
  userId?: string; // userId после проверки токена
  cookies?: Record<string, string>;
}

export const refreshTokenCheck = async (token?: string): Promise<string> => {
  if (!token) {
    throw new GraphQLError("Refresh token required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!);
  } catch {
    throw new GraphQLError("Invalid refresh token", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token },
  });

  if (!storedToken) {
    throw new GraphQLError("Refresh token revoked", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }

  // Возвращаем userId из payload токена
  return decoded.userId;
};
