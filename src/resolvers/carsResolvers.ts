import { IResolvers, AuthenticationError, UserInputError, ApolloError } from "apollo-server-express";
import Car, { CarType } from "../models/car";
import { ApolloContext } from "../server";

const carsResolvers: IResolvers<unknown, ApolloContext> = {
  Query: {
    async cars(_parent, _args, context): Promise<CarType[]> {
      if (!context.user || !context.user.roles.includes("cars")) throw new AuthenticationError("Access denied!");
      const cars = await Car.find();
      return cars;
    },
  },
  Mutation: {
    async createCar(_parent, args, context): Promise<CarType> {
      if (!context.user || !context.user.roles.includes("cars")) throw new AuthenticationError("Access denied!");

      const existing = await Car.findOne({ plateText: args.car.plateText });
      if (existing) {
        throw new UserInputError(`A car with plate ${args.car.plateText} already exists!`, {
          invalidArgs: Object.keys(args),
        });
      }

      const car = new Car(args.car);
      await car.save();

      return car;
    },
    async updateCar(_parent, args, context): Promise<CarType | null> {
      if (!context.user || !context.user.roles.includes("cars")) throw new AuthenticationError("Access denied!");
      try {
        const car = await Car.findByIdAndUpdate(args.car.id, args.car, { new: true });
        return car;
      } catch (err) {
        console.error(err);
        throw new ApolloError("An error occurred while updating the car");
      }
    },
    async deleteCar(_parent, args, context): Promise<string> {
      if (!context.user || !context.user.roles.includes("cars")) throw new AuthenticationError("Access denied!");
      try {
        await Car.findByIdAndDelete(args.car.id);
        return args.id;
      } catch (err) {
        console.error(err);
        throw new ApolloError("An error occurred while deleting the car");
      }
    },
  },
};

export default carsResolvers;
