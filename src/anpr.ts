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

function adjustPlate(plateText: string): string {
  if (!plateText) throw new Error("No plate text found!");
  plateText = plateText.toUpperCase();

  plateText = plateText.replace(" ", "");

  if (plateText.length !== 7) throw new Error(`Expected plate text of 7 characters but found ${plateText.length}!`);

  if (plateText.substr(0, 1) === "0") plateText = `O${plateText.substr(1)}`;
  if (plateText.substr(0, 1) === "1") plateText = `I${plateText.substr(1)}`;
  if (plateText.substr(1, 1) === "0") plateText = `${plateText.substr(0, 1)}O${plateText.substr(2)}`;
  if (plateText.substr(1, 1) === "1") plateText = `${plateText.substr(0, 1)}I${plateText.substr(2)}`;
  if (plateText.substr(2, 1) === "O") plateText = `${plateText.substr(0, 2)}0${plateText.substr(3)}`;
  if (plateText.substr(2, 1) === "I") plateText = `${plateText.substr(0, 2)}1${plateText.substr(3)}`;
  if (plateText.substr(3, 1) === "O") plateText = `${plateText.substr(0, 3)}0${plateText.substr(4)}`;
  if (plateText.substr(3, 1) === "I") plateText = `${plateText.substr(0, 3)}1${plateText.substr(4)}`;
  if (plateText.substr(4, 1) === "0") plateText = `${plateText.substr(0, 4)}O${plateText.substr(5)}`;
  if (plateText.substr(4, 1) === "1") plateText = `${plateText.substr(0, 4)}I${plateText.substr(5)}`;
  if (plateText.substr(5, 1) === "0") plateText = `${plateText.substr(0, 5)}O${plateText.substr(6)}`;
  if (plateText.substr(5, 1) === "1") plateText = `${plateText.substr(0, 5)}I${plateText.substr(6)}`;
  if (plateText.substr(6, 1) === "0") plateText = `${plateText.substr(0, 6)}O`;
  if (plateText.substr(6, 1) === "1") plateText = `${plateText.substr(0, 6)}I`;

  plateText = plateText.substr(0, 4) + " " + plateText.substr(4);

  if (!/[A-Z]{2}\d{2}\s[A-Z]{3}/.test(plateText)) throw new Error("Invalid characters in plate!");

  return plateText;
}

// Send image to AWS to extract the text
export async function getPlateFromImage(image: Buffer): Promise<string> {
  const rekognitionResult = await textFromImage(image);

  const textDetections = (rekognitionResult.TextDetections || []).filter(d => d.Type === "LINE");
  if (!textDetections || textDetections.length === 0) throw new Error("No text detected!");

  textDetections.sort((a, b) => ((a.Confidence || 0) < (b.Confidence || 0) ? 1 : -1));

  const plateLine = textDetections[0];
  if (!plateLine || !plateLine.DetectedText) throw new Error("No line detected in image!");

  const plateText = adjustPlate(plateLine.DetectedText);

  return plateText;
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
      let visit: VisitType | undefined;

      try {
        // Save the arrival of the car to the database
        visit = await createVisit();
        currentVisit = visit;

        // Get an image of the car
        let hrstart = process.hrtime();
        const carImage = await getImage(visit.id);
        let hrend = process.hrtime(hrstart);
        visit.imageCaptureDuration = hrend;

        // Save the file names of the images to the database
        visit.imageNameOrig = carImage.imageNameOrig;
        visit.imageNameCropped = carImage.imageNameCropped;
        await visit.save();

        // Get the plate from the image and save it to the database
        hrstart = process.hrtime();
        visit.plateText = await getPlateFromImage(carImage.image);
        hrend = process.hrtime(hrstart);
        visit.imageOcrDuration = hrend;
        await visit.save();

        // Find the car if it exists
        const car = await Car.findOne({ plateText: visit.plateText });

        // Check if the car has been approved in the meantime
        if (visit.approved) {
          // Save the car if it doesn't already exist
          if (!car) {
            await Car.insertMany([{ plateText: visit.plateText }]);
          }
        } else {
          // If this car is authorized then notify the PLC and save to the database
          if (car) {
            sendAnprResponse();

            visit.approved = true;
            visit.name = car.name;
            visit.mobile = car.mobile;
            await visit.save();
          }
        }

        storeEvents.emit("anprSuccess", visit);
      } catch (err) {
        console.error(err);
        storeEvents.emit("anprError", { err, visit });
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

        if (currentVisit.plateText) {
          const car = await Car.findOne({ plateText: currentVisit.plateText });
          if (!car) {
            await Car.insertMany([{ plateText: currentVisit.plateText }]);
          }
        }
      }
    } catch (err) {
      console.error(err);
      storeEvents.emit("anprError", err);
    }
  }
});
