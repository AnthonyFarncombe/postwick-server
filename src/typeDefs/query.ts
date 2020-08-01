import { gql } from "apollo-server-express";

export default gql`
  type Query {
    cars: [Car!]!
    users: [User!]!
    schedules: [Schedule!]!
    variables(name: String): [Variable!]!
    visits: [Visit!]!
  }
`;
