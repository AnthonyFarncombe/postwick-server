import { gql } from "apollo-server-express";

export const scheduleType = gql`
  type Schedule {
    name: String!
    dayOfWeek: String!
    frequency: Int!
  }
`;
