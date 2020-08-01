import { gql } from "apollo-server-express";

export const carType = gql`
  type Car {
    id: ID!
    plateText: String!
    name: String
    mobile: String
  }

  input CreateCarInput {
    plateText: String!
    name: String
    mobile: String
  }

  input UpdateCarInput {
    id: ID!
    plateText: String!
    name: String
    mobile: String
  }
`;
