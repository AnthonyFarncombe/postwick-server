import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { Request } from "express";
import User from "./models/user";

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

        if (req.connection.remoteAddress !== "::1" && payload.ip !== req.connection.remoteAddress)
          return reject("IP address does not match!");

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

export async function login({
  email,
  password,
  ip,
}: {
  email: string;
  password: string;
  ip: string;
}): Promise<{ userId: string; token: string; tokenExpiration: number }> {
  try {
    const user = await User.findOne({ email });
    if (!user) throw new Error();

    const isEqual = await bcrypt.compare(password, user.passwordHash || "");
    if (!isEqual) throw "Incorrect password";

    const payload: JwtPayload = {
      userId: user.id,
      roles: user.roles || [],
      ip: ip,
    };

    const privateKey = fs.readFileSync(path.resolve(__dirname, "../private.key"), "utf8");
    if (!privateKey) throw "Private key not found!";

    const token = jwt.sign(payload, privateKey, {
      expiresIn: "12h",
      algorithm: "RS256",
    });

    return { userId: user.id, token, tokenExpiration: 12 };
  } catch (err) {
    throw "Email or password is incorrect!";
  }
}
