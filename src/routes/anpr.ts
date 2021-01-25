import express from "express";
import path from "path";
import fs from "fs";
import Car from "../models/car";
import Visit from "../models/visit";

const router = express.Router();

router.get("/cars", async (_req, res) => {
  const cars = await Car.find();
  const carsMapped = cars.map(c => ({ id: c.id, plateText: c.plateText, name: c.name, visits: 0, lastVisit: null }));

  const visits = await Visit.aggregate([
    { $group: { _id: "$plateText", num: { $sum: 1 }, lastVisit: { $max: "$timestamp" } } },
  ]);

  carsMapped.forEach(c => {
    const visit = visits.find(v => v._id === c.plateText);
    if (visit) {
      c.visits = visit.num;
      c.lastVisit = visit.lastVisit;
    }
  });

  res.json(carsMapped);
});

router.get("/visits", async (_req, res) => {
  const visits = await Visit.find();

  const visitsMapped = visits.map(v => ({
    id: v.id,
    timestamp: v.timestamp,
    plateText: v.plateText,
    imageCaptureDuration: v.imageCaptureDuration,
    imageOcrDuration: v.imageOcrDuration,
    imageNameOrig: v.imageNameOrig,
    imageNameCropped: v.imageNameCropped,
  }));

  res.json(visitsMapped);
});

router.get("/image/:name", (req, res) => {
  if (!process.env.CCTV_ARCHIVE) {
    res.sendStatus(404);
    return;
  }

  const imageFile = path.resolve(process.env.CCTV_ARCHIVE, req.params.name);
  if (!fs.existsSync(imageFile)) {
    res.sendStatus(404);
    return;
  }

  res.sendFile(imageFile);
});

export default router;
