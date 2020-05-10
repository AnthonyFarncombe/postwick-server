import { gql } from "apollo-server-express";

export default gql`
  type Query {
    users: [User]
    variables(name: String): [Variable!]!
  }
`;
