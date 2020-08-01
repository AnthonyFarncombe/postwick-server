import query from "./query";
import mutation from "./mutation";
import { authType } from "./types/authType";
import { carType } from "./types/carType";
import { scheduleType } from "./types/scheduleType";
import { userType } from "./types/userType";
import { variableType } from "./types/variableType";
import { visitType } from "./types/visitType";

const typeDefs = [query, mutation, authType, carType, scheduleType, userType, variableType, visitType];

export default typeDefs;
