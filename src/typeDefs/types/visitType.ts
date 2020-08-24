import { gql } from "apollo-server-express";

export const visitType = gql`
  type Visit {
    id: ID!
    timestamp: String!
    imageCaptureDuration: [Float!]
    imageOcrDuration: [Float!]
    imageNameOrig: String
    imageNameCropped: String
    plateText: String
    approved: Boolean!
    name: String
    mobile: String
  }
`;
