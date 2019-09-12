import { gql } from 'apollo-server-express';

export const authType = gql`
  type AuthData {
    userId: ID!
    token: String!
    tokenExpiration: Int!
  }
`;
