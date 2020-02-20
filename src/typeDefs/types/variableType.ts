import { gql } from "apollo-server-express";

export const variableType = gql`
  scalar BoolOrInt

  type Variable {
    name: String!
    value: BoolOrInt!
  }

  input SetVariableValueInput {
    name: String!
    value: BoolOrInt!
  }
`;
