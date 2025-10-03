import type { Request, Response, NextFunction } from "express";
import { GraphQLError } from 'graphql';
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { userId: string };
}

// Middleware для проверки access-токена
export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new GraphQLError('No token provided', {
    extensions: {
    code: 'UNAUTHENTICATED',
  }});

  const token = authHeader.split(" ")[1];
  if (!token) throw new GraphQLError("Invalid token format", { extensions: { code: "UNAUTHENTICATED" }});

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded as { userId: string };
    next();
  } catch (e) {
    throw new GraphQLError("Invalid token", {
    extensions: { code: "UNAUTHENTICATED" },
  });
  }
};