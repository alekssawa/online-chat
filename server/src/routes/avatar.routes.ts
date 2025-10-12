import express from "express";
import prisma from "../lib/prismaClient.js";
import {
  authMiddleware,
  type AuthRequest,
} from "../middlewares/authRest.middleware.js";

const router = express.Router();

router.get(
  "/:userId",
  /*authMiddleware,*/ async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;

      const avatar = await prisma.user_avatars.findUnique({
        where: { user_id: userId as string },
      });

      if (!avatar) return res.status(404).send("Avatar not found");

      res.setHeader(
        "Content-Type",
        avatar.mime_type || "application/octet-stream",
      );
      res.setHeader("Content-Length", avatar.data.length);
      res.end(avatar.data);
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  },
);

router.get(
  "/room/:roomId",
  /*authMiddleware,*/ async (req: AuthRequest, res) => {
    try {
      const { roomId } = req.params;

      const avatar = await prisma.room_avatars.findUnique({
        where: { room_id: roomId as string },
      });

      if (!avatar) return res.status(404).send("Avatar not found");

      res.setHeader(
        "Content-Type",
        avatar.mime_type || "application/octet-stream",
      );
      res.setHeader("Content-Length", avatar.data.length);
      res.end(avatar.data);
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  },
);

export default router;
