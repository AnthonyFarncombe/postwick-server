import { storeEvents, Variable, variables } from "./store";
import { getCCTVImage, ImageWithNames } from "./cctv";
import { textFromImage } from "./aws";
import Visit, { VisitType } from "./models/visit";
import Car from "./models/car";

let currentVisit: VisitType | null = null;

// Requests an image from the camera
// The camera often fails to return an image on the first request so up to three requests are made
async function getImage(carId: string, attempts = 3): Promise<ImageWithNames> {
  let image: ImageWithNames | undefined;

  while (!image && attempts > 0 && currentVisit && currentVisit.id === carId) {
    try {
      image = await getCCTVImage();
      return image;
    } catch (err) {
      attempts--;
    }
  }

  throw new Error("Unable to get image from camera!");
}

// Send image to AWS to extract the text
export async function getPlateFromImage(image: Buffer): Promise<string> {
  const rekognitionResult = await textFromImage(image);

  if (!rekognitionResult.TextDetections || rekognitionResult.TextDetections.length === 0)
    throw new Error("No text detected!");

  const plateLine = rekognitionResult.TextDetections.find(d => d.Type === "LINE");
  if (!plateLine || !plateLine.DetectedText) throw new Error("No line detected in image!");

  return plateLine.DetectedText;
}

// Send a pulse to the PLC to signify the vehicle is on the whitelist
function sendAnprResponse(): void {
  const anprResponse = variables.find(v => v.name === "anprResponse");
  if (!anprResponse) return;
  anprResponse.value = true;
  setTimeout(() => (anprResponse.value = false), 3000);
}

async function createVisit(): Promise<VisitType> {
  const visit = new Visit({ timestamp: new Date(), approved: false });
  await visit.save();
  return visit;
}

storeEvents.on("valueChanged", async (variable: Variable) => {
  if (!variable) return;

  if (variable.name === "anprTrigger") {
    if (variable.value) {
      try {
        // Save the arrival of the car to the database
        const visit = await createVisit();
        currentVisit = visit;

        // Get an image of the car
        let hrstart = process.hrtime();
        const carImage = await getImage(visit.id);
        let hrend = process.hrtime(hrstart);
        visit.imageCaptureDuration = hrend;

        // Save the file names of the images to the database
        visit.imagePathOrig = carImage.imagePathOrig;
        visit.imagePathCropped = carImage.imagePathCropped;
        await visit.save();

        // Get the plate from the image and save it to the database
        hrstart = process.hrtime();
        visit.plateText = await getPlateFromImage(carImage.image);
        hrend = process.hrtime(hrstart);
        visit.imageOcrDuration = hrend;
        await visit.save();

        // Check if this car is authorized
        const car = await Car.findOne({ plateText: visit.plateText });

        // If this car is authorized then notify the PLC and save to the database
        if (car) {
          sendAnprResponse();

          visit.approved = true;
          visit.name = car.name;
          visit.mobile = car.mobile;
          await visit.save();
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      currentVisit = null;
    }
  } else if (variable.name === "anprApprove") {
    try {
      // If the car is still present then save the approval to the database
      if (currentVisit) {
        currentVisit.approved = true;
        await currentVisit.save();

        const car = await Car.findOne({ plateText: currentVisit.plateText });
        if (!car) {
          await Car.insertMany([{ plateText: currentVisit.plateText }]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }
});
