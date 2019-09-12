import { IResolvers } from 'apollo-server-express';
import User, { UserType } from '../models/user';

const usersResolvers: IResolvers = {
  Query: {
    async users(): Promise<UserType[]> {
      const users = await User.find();
      return users;
    },
  },
};

export default usersResolvers;
