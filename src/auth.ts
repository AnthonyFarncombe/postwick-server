import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { Request } from "express";

export interface UserContext {
  userId: string;
  roles: string[];
}

export interface JwtPayload extends UserContext {
  iat?: number;
  exp?: number;
  ip: string;
}

export function getUserFromRequest(req: Request): Promise<UserContext> {
  return new Promise((resolve, reject): void => {
    try {
      const bearerHeader = req.headers.authorization || "";

      if (!bearerHeader || typeof bearerHeader !== "string") return reject();
      const bearer = bearerHeader.split(" ");
      const bearerToken = bearer[1];

      const publicKey = fs.readFileSync(path.resolve(__dirname, "../public.key"), "utf8");
      if (!publicKey) throw new Error("Public key not found!");

      jwt.verify(bearerToken, publicKey, (err, decoded) => {
        if (err) return reject(err);

        const payload = decoded as JwtPayload;

        if (!payload || !payload.exp || Date.now() >= payload.exp * 1000)
          return reject(new Error("JWT token has expired!"));

        if (payload.ip !== req.connection.remoteAddress) return reject("IP address does not match!");

        const userContext: UserContext = {
          userId: payload.userId,
          roles: payload.roles,
        };

        resolve(userContext);
      });
    } catch (err) {
      return reject(err);
    }
  });
}
