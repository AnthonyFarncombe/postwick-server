import { IResolvers, AuthenticationError } from "apollo-server-express";
import Visit, { VisitType } from "../models/visit";
import { ApolloContext } from "../server";

const visitsResolvers: IResolvers<unknown, ApolloContext> = {
  Query: {
    async visits(_parent, _args, context): Promise<VisitType[]> {
      if (!context.user || !context.user.roles.includes("cars")) throw new AuthenticationError("Access denied!");
      const visits = await Visit.find();
      return visits;
    },
  },
};

export default visitsResolvers;
