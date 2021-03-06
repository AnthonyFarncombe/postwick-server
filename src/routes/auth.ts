import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import dayjs from "dayjs";
import handlebars from "handlebars";
import { v4 as uuidv4 } from "uuid";
import { isDate } from "lodash";
import speakeasy from "speakeasy";

import User from "../models/user";
import RefreshToken from "../models/refreshToken";
import { JwtPayload, getUserFromRequest } from "../auth";
import { sendMail } from "../email";

const router = express.Router();

router.get("/me", async (req, res) => {
  try {
    const userContext = await getUserFromRequest(req);
    if (userContext.userId) {
      const user = await User.findById(userContext.userId);
      if (!user) throw new Error();
      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        isLocal: userContext.isLocal,
      });
    } else {
      res.json({ id: "", roles: [] });
    }
  } catch (err) {
    res.sendStatus(401);
  }
});

router.get("/users", async (req, res) => {
  try {
    await getUserFromRequest(req);
    const users = await User.find({ hmiPinConfirmed: true });
    res.json(users.map(u => ({ name: `${u.firstName} ${u.lastName}`, email: u.email })));
  } catch (err) {
    res.json([]);
  }
});

router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      res.sendStatus(401);
      return;
    }

    const clientIpAddress = (req.headers["x-real-ip"] as string) || req.connection.remoteAddress || "";

    const isLocal =
      ["::1", "127.0.0.1", "::ffff:127.0.0.1"].includes(clientIpAddress) ||
      new RegExp(process.env.HMI_CLIENT_IP || "invalid").test(clientIpAddress);

    if (isLocal && req.body.hmi && user.hmiPinConfirmed) {
      const verified = speakeasy.totp.verify({
        secret: user.hmiPinSecret,
        encoding: "base32",
        token: req.body.password,
        window: 1,
      });

      if (!verified) {
        res.sendStatus(401);
        return;
      }
    } else {
      const isEqual = await bcrypt.compare(req.body.password, user.passwordHash || "");

      if (!isEqual) {
        res.sendStatus(401);
        return;
      }
    }

    const payload: JwtPayload = {
      userId: user.id,
      roles: user.roles || [],
    };

    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET || "", { expiresIn: "12h" });

    const refreshToken = new RefreshToken({
      userId: user.id,
      token: uuidv4(),
      createdDate: new Date(),
    });

    await refreshToken.save();

    res.json({ userId: user.id, jwtToken, refreshToken: refreshToken.token, tokenExpiration: 12 });
  } catch (err) {
    res.sendStatus(401);
  }
});

router.post("/refresh", (req, res) => {
  jwt.verify(req.body.jwtToken, process.env.JWT_SECRET || "", { ignoreExpiration: true }, async (err, decoded) => {
    try {
      if (err || !decoded) {
        console.error(err);
        res.sendStatus(401);
        return;
      }

      const existingRefreshToken = await RefreshToken.findOneAndDelete({ token: req.body.refreshToken });
      if (!existingRefreshToken) {
        res.sendStatus(401);
        return;
      }

      const privateKey = fs.readFileSync(path.resolve(__dirname, "../../private.key"), "utf8");
      if (!privateKey) {
        res.sendStatus(401);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { iat, exp, ...payload } = decoded as JwtPayload;

      const jwtToken = jwt.sign(payload, process.env.JWT_SECRET || "", { expiresIn: "12h" });

      const refreshToken = new RefreshToken({
        userId: existingRefreshToken.userId,
        token: uuidv4(),
        createdDate: new Date(),
      });

      await refreshToken.save();

      res.json({ userId: refreshToken.userId, jwtToken, refreshToken: refreshToken.token, tokenExpiration: 12 });
    } catch (err) {
      res.sendStatus(401);
    }
  });
});

router.post("/forgot", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.sendStatus(400);

    const buffer = crypto.randomBytes(20);
    const token = buffer.toString("hex");
    const expires = dayjs()
      .add(30, "minute")
      .toDate();

    await User.findByIdAndUpdate({ _id: user._id }, { $set: { resetToken: token, resetExpires: expires } });

    await sendMail({
      to: user.email,
      template: "forgot-password",
      subject: "Reset Password",
      context: {
        url: handlebars.compile(req.body.url)({ token }),
        name: user.firstName,
      },
    });

    if (token) {
      return res.sendStatus(200);
    } else {
      return res.sendStatus(400);
    }
  } catch (err) {
    console.error(err);
    return res.sendStatus(400);
  }
});

router.post("/reset", async (req, res) => {
  try {
    const user = await User.findOne({ resetToken: req.body.token });
    if (!user) {
      return res.status(400).send("Cannot find user!");
    }

    if (user.email !== req.body.email) {
      return res.status(400).send("Email address does not match!");
    }

    let expires = dayjs("1900-01-01");
    if (isDate(user.resetExpires)) expires = dayjs(user.resetExpires);
    if (expires.diff(dayjs(), "minute") < 0) {
      return res.status(400).send("Token has expired");
    }

    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
    if (!strongRegex.test(req.body.password || "")) {
      return res.status(400).send("Password does not meet complexity requirements!");
    }

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    await User.findByIdAndUpdate(user._id, {
      $set: { passwordHash },
      $unset: { resetToken: 1, resetExpires: 1 },
    });

    return res.sendStatus(200);
  } catch (err) {
    return res.sendStatus(400);
  }
});

router.post("/setuphmipin", async (req, res) => {
  try {
    const userContext = await getUserFromRequest(req);
    if (!userContext || !userContext.userId) {
      return res.sendStatus(401);
    }

    const user = await User.findById(userContext.userId);
    if (!user) return res.sendStatus(401);

    const secret = speakeasy.generateSecret({ name: user.email });

    await User.updateOne(
      { _id: userContext.userId },
      { $set: { hmiPinSecret: secret.base32, hmiPinConfirmed: false } },
    );

    return res.json({ secret: secret.otpauth_url + "&issuer=Postwick%20BMS" });
  } catch (err) {
    return res.sendStatus(401);
  }
});

router.post("/verifyhmipin", async (req, res) => {
  try {
    const userContext = await getUserFromRequest(req);
    if (!userContext || !userContext.userId) {
      return res.sendStatus(401);
    }

    const user = await User.findById(userContext.userId);
    if (!user) {
      return res.sendStatus(401);
    }

    const verified = speakeasy.totp.verify({
      secret: user.hmiPinSecret,
      encoding: "base32",
      token: req.body.token,
      window: 1,
    });
    if (verified) {
      if (req.body.confirm) {
        user.hmiPinConfirmed = true;
        await user.save();
      }
      return res.sendStatus(200);
    } else {
      return res.sendStatus(401);
    }
  } catch (err) {
    return res.sendStatus(401);
  }
});

export default router;
