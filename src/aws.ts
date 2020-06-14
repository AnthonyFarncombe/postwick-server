import AWS from "aws-sdk";

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export async function sendSMS({ phoneNumber, message }: { phoneNumber: string; message: string }): Promise<void> {
  try {
    const messageAttributes: AWS.SNS.MessageAttributeMap = {
      "AWS.SNS.SMS.SenderID": {
        DataType: "String",
        StringValue: "Postwick",
      },
      "AWS.SNS.SMS.SMSType": {
        DataType: "String",
        StringValue: "Transactional",
      },
    };

    const params: AWS.SNS.PublishInput = {
      MessageAttributes: messageAttributes,
      Message: message,
      PhoneNumber: phoneNumber,
    };

    await new AWS.SNS({ apiVersion: "2010-03-31" }).publish(params).promise();
  } catch (err) {
    console.error(err);
  }
}

export async function textFromImage(image: Buffer): Promise<AWS.Rekognition.DetectTextResponse> {
  const params: AWS.Rekognition.DetectTextRequest = {
    Image: {
      Bytes: image,
    },
  };

  const response = await new AWS.Rekognition().detectText(params).promise();
  return response;
}
