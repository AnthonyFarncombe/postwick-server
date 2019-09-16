import { gql } from 'apollo-server-express';

export default gql`
  type Mutation {
    login(email: String!, password: String!): AuthData!
    forgotPassword(email: String!, url: String!): Boolean!
    resetPassword(token: String!, email: String!, password: String!): Boolean!

    createUser(user: CreateUserInput): User!
    updateUser(user: UpdateUserInput): User!
    deleteUser(id: ID!): ID!
  }
`;
