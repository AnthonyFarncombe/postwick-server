import query from './query';
import mutation from './mutation';
import { authType } from './types/authType';
import { userType } from './types/userType';

const typeDefs = [query, mutation, authType, userType];

export default typeDefs;
