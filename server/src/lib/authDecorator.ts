import type { GraphQLFieldResolver, GraphQLResolveInfo } from "graphql";
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import type { Response } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";

// Функция, которая вызывает authMiddleware
const requireAuth = async (req: AuthRequest, res: Response) => {
  await new Promise<void>((resolve, reject) => {
    authMiddleware(req, res, (err?: any) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

// Декоратор для резолвера
export const withAuth = <TArgs = any, TResult = any>(
  resolver: GraphQLFieldResolver<
    any,
    { req: AuthRequest; res: Response },
    TArgs
  >,
) => {
  return async (
    parent: any,
    args: TArgs,
    context: { req: AuthRequest; res: Response },
    info: GraphQLResolveInfo,
  ) => {
    await requireAuth(context.req, context.res); // проверяем токен

    // ✅ Добавляем userId в контекст GraphQL
    const enhancedContext = {
      ...context,
      userId: context.req.user?.userId, // извлекаем userId из req.user
    };

    return resolver(parent, args, enhancedContext, info);
  };
};
