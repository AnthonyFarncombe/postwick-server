import { gql } from "apollo-server-express";

export const scheduleType = gql`
  type Schedule {
    id: ID!
    name: String!
    dayOfWeek: String!
    timeOfMeeting: String!
    warmupTime: String!
    temperature: Float
    frequency: Int!
    startDate: String
    overrideDay: Boolean
  }
`;
