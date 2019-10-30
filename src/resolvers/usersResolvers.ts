import { IResolvers, AuthenticationError, UserInputError, ApolloError } from "apollo-server-express";
import bcrypt from "bcryptjs";
import User, { UserType } from "../models/user";
import { ApolloContext } from "../server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const usersResolvers: IResolvers<any, ApolloContext> = {
  Query: {
    async users(_parent, _args, context): Promise<UserType[]> {
      if (!context.user || !context.user.roles.includes("users")) throw new AuthenticationError("Access denied!");
      const users = await User.find();
      return users;
    },
  },
  Mutation: {
    async createUser(_parent, args, context): Promise<UserType> {
      if (!context.user || !context.user.roles.includes("users")) throw new AuthenticationError("Access denied!");

      const existing = await User.findOne({ email: args.user.email });
      if (existing) {
        throw new UserInputError(`A user with email address ${args.user.email} already exists!`, {
          invalidArgs: Object.keys(args),
        });
      }

      const password = Math.random()
        .toString(30)
        .slice(-10);

      const passwordHash = await bcrypt.hash(password, 10);

      const user = new User({ ...args.user, password: passwordHash });
      await user.save();

      return user;
    },
    async updateUser(_parent, args, context): Promise<UserType | null> {
      if (!context.user || !context.user.roles.includes("users")) throw new AuthenticationError("Access denied!");
      try {
        const user = await User.findByIdAndUpdate(args.user.id, args.user, {
          new: true,
        });
        return user;
      } catch (err) {
        console.error(err);
        throw new ApolloError("An error occurred while updating the user");
      }
    },
    async deleteUser(_parent, args, context): Promise<string> {
      if (!context.user || !context.user.roles.includes("users")) throw new AuthenticationError("Access denied!");
      try {
        await User.findByIdAndDelete(args.id);
        return args.id;
      } catch (err) {
        console.error(err);
        throw new ApolloError("An error occurred while deleting the user");
      }
    },
  },
};

export default usersResolvers;
