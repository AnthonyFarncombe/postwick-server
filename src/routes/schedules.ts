import express from "express";

import { getSchedules, getMinutesUntilNextMeeting } from "../scheduler";

const router = express.Router();

router.get("/", async (_req, res) => {
  const schedules = await getSchedules();
  res.json(schedules);
});

router.get("/next-meeting", async (_req, res) => {
  const nextMeeting = await getMinutesUntilNextMeeting();
  res.json(nextMeeting);
});

export default router;
