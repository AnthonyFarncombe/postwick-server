import express from "express";
import store from "../store";

const router = express.Router();

router.get("/", (_req, res) => res.json(store.variables));

router.get("/:name", (req, res) =>
  res.json(store.variables.find(v => v.name.toLowerCase() === req.params.name.toLowerCase())),
);

export default router;
