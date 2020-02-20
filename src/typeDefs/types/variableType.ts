import { gql } from "apollo-server-express";

export const variableType = gql`
  scalar BoolOrInt

  type Variable {
    name: String!
    text: String
    value: BoolOrInt!
    group: String
  }

  input SetVariableValueInput {
    name: String!
    value: BoolOrInt!
  }
`;
