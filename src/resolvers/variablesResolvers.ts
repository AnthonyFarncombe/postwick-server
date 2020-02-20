import { IResolvers } from "apollo-server-express";
import { ApolloContext } from "../server";
import store, { VariableValueType } from "../store";
import { GraphQLScalarType } from "graphql";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const variablesResolvers: IResolvers<any, ApolloContext> = {
  BoolOrInt: new GraphQLScalarType({
    name: "BoolOrInt",
    description: "Variable value type",
    serialize(value): VariableValueType {
      return value;
    },
    parseValue(value): VariableValueType {
      return value;
    },
  }),
  Query: {
    variables(): { name: string; value: VariableValueType }[] {
      return store.variables;
    },
  },
  Mutation: {
    setVariableValue(_parent, { name, value }: { name: string; value: VariableValueType }): boolean {
      const variable = store.variables.find(v => v.name === name);
      if (!variable) return false;

      variable.setValue(value);
      return true;
    },
  },
};

export default variablesResolvers;
