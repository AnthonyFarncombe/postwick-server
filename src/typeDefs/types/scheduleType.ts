import { gql } from "apollo-server-express";

export const scheduleType = gql`
  type Schedule {
    id: ID!
    dayOfWeek: String!
    timeOfMeeting: String!
    frequency: String!
    startDate: String
    overrideDay: Boolean!
  }
`;
