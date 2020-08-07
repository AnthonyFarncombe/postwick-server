import urllib from "urllib";
import Jimp from "jimp";
import path from "path";
import fs from "fs";
import moment from "moment";

export interface ImageWithNames {
  image: Buffer;
  imagePathOrig: string | undefined;
  imagePathCropped: string | undefined;
}

export async function getCCTVImage(): Promise<ImageWithNames> {
  const url: string = process.env.CCTV_URL || "";
  const username = process.env.CCTV_USERNAME;
  const password = process.env.CCTV_PASSWORD;

  const { res, data } = await urllib.request(url, { digestAuth: `${username}:${password}`, timeout: [15000, 15000] });
  if (res.statusCode !== 200) throw new Error("Unable to download image!");

  const jimpImage = await Jimp.read(data);

  jimpImage.crop(
    jimpImage.getWidth() * 0.32,
    jimpImage.getHeight() * 0.3,
    jimpImage.getWidth() * 0.25,
    jimpImage.getHeight() * 0.25,
  );

  // Save images to archive
  let imagePathOrig: string | undefined;
  let imagePathCropped: string | undefined;
  try {
    if (process.env.CCTV_ARCHIVE) {
      imagePathOrig = path.resolve(process.env.CCTV_ARCHIVE, `gate_${moment().format("YYYYMMDD_HHmmss")}.jpg`);
      fs.writeFile(imagePathOrig, data, err => err && console.error(err));

      imagePathCropped = path.resolve(
        process.env.CCTV_ARCHIVE,
        `gate_cropped_${moment().format("YYYYMMDD_HHmmss")}.jpg`,
      );
      jimpImage.writeAsync(imagePathCropped).catch(err => console.error(err));
    }
  } catch (err) {
    console.error(err);
  }

  const image = await jimpImage.getBufferAsync("image/jpeg");

  return { image, imagePathOrig, imagePathCropped };
}
