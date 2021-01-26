import express from "express";
import path from "path";
import fs from "fs";
import Car, { CarType } from "../models/car";
import Visit from "../models/visit";

const router = express.Router();

interface CarJson {
  id: string;
  plateText: string;
  name?: string;
  vehicleType?: string;
}

const transformCar = (car: CarType): CarJson => ({
  id: car.id,
  plateText: car.plateText,
  name: car.name,
  vehicleType: car.vehicleType,
});

router.get("/cars", async (_req, res) => {
  const cars = await Car.find();
  const carsMapped = cars.map(c => transformCar(c));
  res.json(carsMapped);
});

router.get("/visits", async (_req, res) => {
  const visits = await Visit.find().sort({ timestamp: -1 });

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

router.post("/car", async (req, res) => {
  const plateText = (req.body.plateText || "").replace(" ", "").toUpperCase();
  if (!plateText || !/^[A-Z]{2}\d{2}[A-Z]{3}$/.test(plateText)) {
    res.sendStatus(400);
    return;
  }

  const car = new Car({
    plateText,
    name: req.body.name,
    vehicleType: req.body.vehicleType,
  });

  try {
    const savedCar = await car.save();

    res.json(transformCar(savedCar));
  } catch (err) {
    res.sendStatus(400);
  }
});

router.put("/car/:id", async (req, res) => {
  try {
    const plateText = (req.body.plateText || "").replace(" ", "").toUpperCase();
    if (!plateText || !/^[A-Z]{2}\d{2}[A-Z]{3}$/.test(plateText)) {
      res.sendStatus(400);
      return;
    }

    const car = await Car.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          plateText,
          name: req.body.name,
          vehicleType: req.body.vehicleType,
        },
      },
      { new: true },
    );

    if (car) {
      res.json(transformCar(car));
    } else {
      res.sendStatus(404);
    }
  } catch (err) {
    res.sendStatus(400);
  }
});

router.delete("/car/:id", async (req, res) => {
  try {
    await Car.findByIdAndDelete(req.params.id);
    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(404);
  }
});

export default router;
