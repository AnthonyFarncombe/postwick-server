import { IResolvers, AuthenticationError } from "apollo-server-express";
import Schedule, { ScheduleType } from "../models/schedule";
import { ApolloContext } from "../server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const schedulesResolvers: IResolvers<any, ApolloContext> = {
  Query: {
    async schedules(_parent, _args, context): Promise<ScheduleType[]> {
      if (!context.user || !context.user.roles.includes("schedules")) throw new AuthenticationError("Access denied!");
      const schedules = await Schedule.find();
      return schedules;
    },
  },
};

export default schedulesResolvers;
