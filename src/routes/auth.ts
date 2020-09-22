import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import moment from "moment";
import handlebars from "handlebars";
import { isDate } from "lodash";

import User from "../models/user";
import { JwtPayload, getUserFromRequest } from "../auth";
import { sendMail } from "../email";

const router = express.Router();

router.get("/me", async (req, res) => {
  try {
    const userContext = await getUserFromRequest(req);
    const user = await User.findById(userContext.userId);
    if (!user) throw new Error();
    res.json({ id: user.id });
  } catch (err) {
    res.sendStatus(401);
  }
});

router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.sendStatus(401);

    if (req.body.hmi && process.env.HMI_CLIENT_IP) {
      const regex = new RegExp(process.env.HMI_CLIENT_IP);
      if (req.connection.remoteAddress !== "::1" && !regex.test(req.connection.remoteAddress || "")) {
        return res.sendStatus(401);
      }
    } else {
      const isEqual = await bcrypt.compare(req.body.password, user.passwordHash || "");
      if (!isEqual) return res.sendStatus(401);
    }

    const payload: JwtPayload = {
      userId: user.id,
      roles: user.roles || [],
      ip: req.connection.remoteAddress || "",
    };

    const privateKey = fs.readFileSync(path.resolve(__dirname, "../../private.key"), "utf8");
    if (!privateKey) return res.sendStatus(401);

    const token = jwt.sign(payload, privateKey, {
      expiresIn: "12h",
      algorithm: "RS256",
    });

    return res.json({ userId: user.id, token, tokenExpiration: 12 });
  } catch (err) {
    return res.sendStatus(401);
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.sendStatus(400);

    const buffer = crypto.randomBytes(20);
    const token = buffer.toString("hex");
    const expires = moment()
      .add(30, "minute")
      .toDate();

    await User.findByIdAndUpdate({ _id: user._id }, { $set: { resetToken: token, resetExpires: expires } });

    sendMail({
      to: user.email,
      template: "forgot-password",
      subject: "Reset Password",
      context: {
        url: handlebars.compile(req.body.url)({ token }),
        name: user.firstName,
      },
    }).catch(err => console.error(err));

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

router.post("/reset-password", async (req, res) => {
  try {
    const user = await User.findOne({ resetToken: req.body.token });
    if (!user) {
      return res.sendStatus(400).send("Cannot find user!");
    }

    if (user.email !== req.body.email) {
      return res.sendStatus(400).send("Email address does not match!");
    }

    let expires = moment("1900-01-01");
    if (isDate(user.resetExpires)) expires = moment(user.resetExpires);
    if (moment.duration(expires.diff(moment())).minutes() < 0) {
      return res.sendStatus(400).send("Token has expired");
    }

    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
    if (!strongRegex.test(req.body.password || "")) {
      return res.sendStatus(400).send("Password does not meet complexity requirements!");
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

export default router;
