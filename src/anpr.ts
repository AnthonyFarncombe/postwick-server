import { storeEvents, Variable, variables } from "./store";
import { getCCTVImage, ImageWithNames } from "./cctv";
import { textFromImage } from "./aws";
import Car, { CarType } from "./models/car";

let carPresent: CarType | null = null;

// Requests an image from the camera
// The camera often fails to return an image on the first request so up to three requests are made
async function getImage(carId: string, attempts = 3): Promise<ImageWithNames> {
  let image: ImageWithNames | undefined;

  while (!image && attempts > 0 && carPresent && carPresent.id === carId) {
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

async function createCar(): Promise<CarType> {
  const car = new Car({ timestamp: new Date(), approved: false });
  await car.save();
  return car;
}

storeEvents.on("valueChanged", async (variable: Variable) => {
  if (!variable) return;

  if (variable.name === "anprTrigger") {
    if (variable.value) {
      try {
        // Save the arrival of the car to the database
        const car = await createCar();
        carPresent = car;

        // Get an image of the car
        const carImage = await getImage(car.id);

        // Save the file names of the images to the database
        car.imagePathOrig = carImage.imagePathOrig;
        car.imagePathCropped = carImage.imagePathCropped;
        await car.save();

        // Get the plate from the image and save it to the database
        car.plateText = await getPlateFromImage(carImage.image);
        await car.save();

        // Check if this car has been previously approved
        const previousVisit = await Car.findOne({ plateText: car.plateText, approved: true });

        // If this car has been previously approved then notify the PLC and save to the database
        if (previousVisit) {
          sendAnprResponse();

          car.approved = true;
          await car.save();
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      carPresent = null;
    }
  } else if (variable.name === "anprApprove") {
    try {
      // If the car is still present then save the approval to the database
      if (carPresent) {
        carPresent.approved = true;
        await carPresent.save();
      }
    } catch (err) {
      console.error(err);
    }
  }
});
