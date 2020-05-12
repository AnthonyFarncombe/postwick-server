import { gql } from "apollo-server-express";

export default gql`
  type Query {
    users: [User]
    schedules: [Schedule!]!
    variables(name: String): [Variable!]!
  }
`;
