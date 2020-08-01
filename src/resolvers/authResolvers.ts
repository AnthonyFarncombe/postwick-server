import { IResolvers, ApolloError, AuthenticationError, ValidationError } from "apollo-server-express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import moment from "moment";
import handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { isDate } from "lodash";
import User from "../models/user";
import { JwtPayload } from "../auth";
import { sendMail } from "../email";

const authResolvers: IResolvers<unknown, JwtPayload> = {
  Mutation: {
    async login(
      _parent,
      { email, password }: { email: string; password: string },
      context,
    ): Promise<{ userId: string; token: string; tokenExpiration: number }> {
      try {
        const user = await User.findOne({ email });
        if (!user) throw new AuthenticationError("Email or password is incorrect!");

        const isEqual = await bcrypt.compare(password, user.passwordHash || "");
        if (!isEqual) throw new AuthenticationError("Email or password is incorrect!");

        const payload: JwtPayload = {
          userId: user.id,
          roles: user.roles || [],
          ip: context.ip,
        };

        const privateKey = fs.readFileSync(path.resolve(__dirname, "../../private.key"), "utf8");
        if (!privateKey) throw new Error("Private key not found!");

        const token = jwt.sign(payload, privateKey, {
          expiresIn: "12h",
          algorithm: "RS256",
        });

        return { userId: user.id, token, tokenExpiration: 12 };
      } catch (err) {
        if (err instanceof ApolloError) throw err;

        console.error(err);
        throw new ApolloError("An error has occurred!");
      }
    },
    async forgotPassword(_parent, { email, url }: { email: string; url: string }): Promise<boolean> {
      try {
        const user = await User.findOne({ email });
        if (!user) return true;

        const buffer = crypto.randomBytes(20);
        const token = buffer.toString("hex");
        const expires = moment()
          .add(30, "minute")
          .toDate();

        await User.findByIdAndUpdate({ _id: user._id }, { $set: { resetToken: token, resetExpires: expires } });

        sendMail({
          to: user.email,
          template: "forgot-password",
          subject: "Reset Password",
          context: {
            url: handlebars.compile(url)({ token }),
            name: user.firstName,
          },
        }).catch(err => console.error(err));

        return !!token;
      } catch (err) {
        console.error(err);
        throw new ApolloError("An error has occurred");
      }
    },
    async resetPassword(
      _parent,
      { token, email, password }: { token: string; email: string; password: string },
    ): Promise<boolean> {
      try {
        const user = await User.findOne({ resetToken: token });
        if (!user) {
          throw new ValidationError("Cannot find user!");
        }

        if (user.email !== email) {
          throw new ValidationError("Email address does not match!");
        }

        let expires = moment("1900-01-01");
        if (isDate(user.resetExpires)) expires = moment(user.resetExpires);
        if (moment.duration(expires.diff(moment())).minutes() < 0) {
          throw new ValidationError("Token has expired");
        }

        const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
        if (!strongRegex.test(password || "")) {
          throw new ValidationError("Password does not meet complexity requirements!");
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await User.findByIdAndUpdate(user._id, {
          $set: { passwordHash },
          $unset: { resetToken: 1, resetExpires: 1 },
        });

        return true;
      } catch (err) {
        if (err instanceof ApolloError) {
          throw err;
        } else {
          console.error(err);
          throw new ApolloError("An error has occurred");
        }
      }
    },
  },
};

export default authResolvers;
