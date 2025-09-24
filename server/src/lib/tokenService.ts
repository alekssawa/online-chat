import jwt from "jsonwebtoken";
import prisma from "./prismaClient.js";

const ACCESS_TOKEN_EXPIRY = "1m";
const REFRESH_TOKEN_EXPIRY = "7d";

export const generateTokens = async (userId: string) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  // сохраняем refresh токен в БД
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken };
};