import query from "./query";
import mutation from "./mutation";
import { authType } from "./types/authType";
import { userType } from "./types/userType";
import { variableType } from "./types/variableType";

const typeDefs = [query, mutation, authType, userType, variableType];

export default typeDefs;
