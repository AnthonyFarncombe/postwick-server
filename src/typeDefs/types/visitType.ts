import { gql } from "apollo-server-express";

export const visitType = gql`
  type Visit {
    id: ID!
    timestamp: String!
    imageCaptureDuration: [Float!]
    imageOcrDuration: [Float!]
    imagePathOrig: String
    imagePathCropped: String
    plateText: String
    approved: Boolean!
    name: String
    mobile: String
  }
`;
