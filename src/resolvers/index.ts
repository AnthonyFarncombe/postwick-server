import authResolvers from "./authResolvers";
import schedulesResolvers from "./schedulesResolver";
import usersResolvers from "./usersResolvers";
import variablesResolvers from "./variablesResolvers";

const resolvers = [authResolvers, schedulesResolvers, usersResolvers, variablesResolvers];

export default resolvers;
