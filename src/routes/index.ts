import express from "express";

import { authMiddleware } from "../auth";

import auth from "./auth";
import cctv from "./cctv";
import users from "./users";
import variables from "./variables";

const router = express.Router();

router.get("/", (req, res) => res.json({ ip: req.connection.remoteAddress }));

router.use("/auth", auth);
router.use("/cctv", cctv);
router.use("/users", authMiddleware("users"), users);
router.use("/variables", authMiddleware(), variables);

export default router;
