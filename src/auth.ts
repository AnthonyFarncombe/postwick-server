import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import User from "./models/user";

export interface UserData {
  userId: string;
  roles: string[];
}

export interface JwtPayload extends UserData {
  iat?: number;
  exp?: number;
}

export interface UserContext extends UserData {
  isLocal: boolean;
}

export async function getUserFromRequest(req: Request): Promise<UserContext> {
  const clientIpAddress = (req.headers["x-real-ip"] as string) || req.connection.remoteAddress || "";

  const isLocal =
    ["::1", "127.0.0.1", "::ffff:127.0.0.1"].includes(clientIpAddress) ||
    new RegExp(process.env.HMI_CLIENT_IP || "invalid").test(clientIpAddress);

  try {
    const bearerHeader = req.headers.authorization || "";

    if (!bearerHeader || typeof bearerHeader !== "string") throw new Error("No bearer header!");
    const bearer = bearerHeader.split(" ");
    const bearerToken = bearer[1];

    const userContext: UserContext = await new Promise((resolve, reject) => {
      jwt.verify(bearerToken, process.env.JWT_SECRET || "", (err, decoded) => {
        if (err) return reject(err);

        const payload = decoded as JwtPayload;

        if (!payload || !payload.exp || Date.now() >= payload.exp * 1000)
          return reject(new Error("JWT token has expired!"));

        resolve({
          userId: payload.userId,
          roles: payload.roles,
          isLocal,
        });
      });
    });

    return userContext;
  } catch (err) {
    if (isLocal && !(err instanceof jwt.TokenExpiredError)) {
      const userContext: UserContext = {
        userId: "",
        roles: [],
        isLocal,
      };
      return userContext;
    } else {
      throw err;
    }
  }
}

export function authMiddleware(role?: string): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    getUserFromRequest(req)
      .then(userContext => {
        if (role && !userContext.roles.includes(role)) {
          res.sendStatus(401);
        } else {
          next();
        }
      })
      .catch(() => res.sendStatus(401));
  };
}

export async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<{ userId: string; token: string; tokenExpiration: number }> {
  try {
    const user = await User.findOne({ email });
    if (!user) throw new Error();

    const isEqual = await bcrypt.compare(password, user.passwordHash || "");
    if (!isEqual) throw "Incorrect password";

    const payload: JwtPayload = {
      userId: user.id,
      roles: user.roles || [],
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || "", { expiresIn: "12h" });

    return { userId: user.id, token, tokenExpiration: 12 };
  } catch (err) {
    throw "Email or password is incorrect!";
  }
}
