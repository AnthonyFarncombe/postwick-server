import express from "express";
import path from "path";
import { getCCTVImage, getGateFaceImage } from "../cctv";
import { getPlateFromImage } from "../anpr";
import Visit from "../models/visit";

const router = express.Router();

router.get("/:type?/:id?", async (req, res) => {
  try {
    if (req.params.type && /^(orig|cropped|face)$/.test(req.params.type) && req.params.id) {
      const visit = await Visit.findById(req.params.id);
      if (visit) {
        const filename = req.params.type === "cropped" ? visit.imageNameCropped : visit.imageNameOrig;
        if (filename && process.env.CCTV_ARCHIVE) {
          res.sendFile(path.resolve(process.env.CCTV_ARCHIVE, filename));
        } else {
          res.sendStatus(404);
        }
      } else {
        res.sendStatus(404);
        return;
      }
    } else if (req.params.type === "face") {
      const image = await getGateFaceImage();
      res.contentType("image/jpeg");
      res.send(image);
    } else {
      const image = await getCCTVImage();
      res.contentType("image/jpeg");
      res.send(image);
    }
  } catch (err) {
    res.json(err);
  }
});

router.get("/anpr", async (_req, res) => {
  try {
    const image = await getCCTVImage();
    const plate = await getPlateFromImage(image.image);
    res.json({ plate });
  } catch (err) {
    res.json(err);
  }
});

export default router;
