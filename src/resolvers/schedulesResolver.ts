import { IResolvers, AuthenticationError } from "apollo-server-express";
import Schedule, { ScheduleType } from "../models/schedule";
import { ApolloContext } from "../server";

const schedulesResolvers: IResolvers<unknown, ApolloContext> = {
  Query: {
    async schedules(_parent, _args, context): Promise<ScheduleType[]> {
      if (!context.user || !context.user.roles.includes("schedules")) throw new AuthenticationError("Access denied!");
      const schedules = await Schedule.find();
      return schedules;
    },
  },
  Mutation: {},
};

export default schedulesResolvers;
