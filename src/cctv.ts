import urllib from "urllib";
import Jimp from "jimp";
import path from "path";
import fs from "fs";
import dayjs from "dayjs";

export interface ImageWithNames {
  image: Buffer;
  imageNameOrig: string | undefined;
  imageNameCropped: string | undefined;
}

export interface GateFaceImageWithName {
  image: Buffer;
  imageName: string | undefined;
}

export async function getCCTVImage(): Promise<ImageWithNames> {
  const url: string = process.env.CCTV_URL || "";
  const username = process.env.CCTV_USERNAME;
  const password = process.env.CCTV_PASSWORD;

  const { res, data } = await urllib.request(url, { digestAuth: `${username}:${password}`, timeout: [15000, 15000] });
  if (res.statusCode !== 200) throw new Error("Unable to download image!");

  const jimpImage = await Jimp.read(data);

  jimpImage.crop(
    jimpImage.getWidth() * 0.25,
    jimpImage.getHeight() * 0.25,
    jimpImage.getWidth() * 0.27,
    jimpImage.getHeight() * 0.25,
  );

  // Save images to archive
  const imageNameOrig = `gate_${dayjs().format("YYYYMMDD_HHmmss")}.jpg`;
  const imageNameCropped = `gate_cropped_${dayjs().format("YYYYMMDD_HHmmss")}.jpg`;
  try {
    if (process.env.CCTV_ARCHIVE) {
      const imagePathOrig = path.resolve(process.env.CCTV_ARCHIVE, imageNameOrig);
      fs.writeFile(imagePathOrig, data, err => err && console.error(err));

      const imagePathCropped = path.resolve(process.env.CCTV_ARCHIVE, imageNameCropped);
      jimpImage.writeAsync(imagePathCropped).catch(err => console.error(err));
    }
  } catch (err) {
    console.error(err);
  }

  const image = await jimpImage.getBufferAsync("image/jpeg");

  return { image, imageNameOrig, imageNameCropped };
}

export async function getGateFaceImage(): Promise<GateFaceImageWithName> {
  const url: string = process.env.CCTV_GATE_FACE_URL || "";
  const username = process.env.CCTV_USERNAME;
  const password = process.env.CCTV_PASSWORD;

  const { res, data } = await urllib.request(url, { digestAuth: `${username}:${password}`, timeout: [15000, 15000] });
  if (res.statusCode !== 200) throw new Error("Unable to download image!");

  const imageName = `gate_face_${dayjs().format("YYYYMMDD_HHmmss")}.jpg`;

  return { image: data, imageName };
}
