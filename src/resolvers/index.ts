import authResolvers from "./authResolvers";
import carsResolvers from "./carsResolvers";
import schedulesResolvers from "./schedulesResolver";
import usersResolvers from "./usersResolvers";
import variablesResolvers from "./variablesResolvers";
import visitsResolvers from "./visitsResolvers";

const resolvers = [
  authResolvers,
  carsResolvers,
  schedulesResolvers,
  usersResolvers,
  variablesResolvers,
  visitsResolvers,
];

export default resolvers;
