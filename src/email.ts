import fs from "fs";
import nodemailer from "nodemailer";
import handlebars from "handlebars";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import SendmailTransport from "nodemailer/lib/sendmail-transport";
import Mail from "nodemailer/lib/mailer";

const smtpTransport: SMTPTransport.Options = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "25"),
  secure: process.env.EMAIL_SSL === "true",
};

const options: SendmailTransport.Options = {
  from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
  sendmail: true,
};

const transporter = nodemailer.createTransport(smtpTransport, options);

export async function sendMail({
  to,
  template,
  subject,
  context,
}: {
  to: string | Mail.Address | (string | Mail.Address)[];
  template: string;
  subject: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any;
}): Promise<void> {
  const source = await new Promise((resolve, reject): void => {
    fs.readFile(`./src/templates/${template}.hbs`, "utf8", (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  const html = handlebars.compile(source)(context);
  await transporter.sendMail({ to, subject, html });
}
