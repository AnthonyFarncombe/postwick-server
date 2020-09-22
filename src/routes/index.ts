import express from "express";
// import jwt from "express-jwt";

import { authMiddleware } from "../auth";

import auth from "./auth";
import cctv from "./cctv";
import users from "./users";

const router = express.Router();

router.get("/", (_req, res) => res.json({ hello: "world" }));

router.use("/auth", auth);
router.use("/cctv", cctv);
router.use("/users", authMiddleware("users"), users);

export default router;
