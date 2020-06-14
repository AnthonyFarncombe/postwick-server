import { storeEvents, Variable } from "./store";
import { getCCTVImage } from "./cctv";
import { textFromImage } from "./aws";

storeEvents.on("valueChanged", (variable: Variable) => {
  if (!variable || variable.name !== "anprTrigger" || !variable.value) return;
});

export async function getNumberPlate(): Promise<string> {
  const image = await getCCTVImage();

  const rekognitionResult = await textFromImage(image);

  console.log(rekognitionResult.TextDetections);
  if (!rekognitionResult.TextDetections || rekognitionResult.TextDetections.length === 0)
    throw new Error("No text detected!");

  console.log("About to search for text");
  const plateLine = rekognitionResult.TextDetections.find(d => d.Type === "LINE");
  if (!plateLine || !plateLine.DetectedText) throw new Error("No line detected in image!");

  return plateLine.DetectedText;
}
