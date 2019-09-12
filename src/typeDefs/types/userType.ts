import { gql } from 'apollo-server-express';

export const userType = gql`
  type User {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    roles: [String!]
  }

  input CreateUserInput {
    firstName: String!
    lastName: String!
    email: String!
    roles: [String!]
  }

  input UpdateUserInput {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    roles: [String!]
  }
`;
