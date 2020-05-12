import query from "./query";
import mutation from "./mutation";
import { authType } from "./types/authType";
import { scheduleType } from "./types/scheduleType";
import { userType } from "./types/userType";
import { variableType } from "./types/variableType";

const typeDefs = [query, mutation, authType, scheduleType, userType, variableType];

export default typeDefs;
