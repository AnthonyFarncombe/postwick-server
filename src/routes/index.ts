import express from "express";

import { authMiddleware } from "../auth";

import auth from "./auth";
import cctv from "./cctv";
import users from "./users";
import variables from "./variables";

const router = express.Router();

router.get("/", (_req, res) => res.json({ hello: "world" }));

router.use("/auth", auth);
router.use("/cctv", cctv);
router.use("/users", authMiddleware("users"), users);
router.use("/variables", authMiddleware(), variables);

export default router;
