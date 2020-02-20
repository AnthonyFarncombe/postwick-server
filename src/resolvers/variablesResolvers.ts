import { IResolvers, ApolloError } from "apollo-server-express";
import { ApolloContext } from "../server";
import store, { VariableValueType, Variable } from "../store";
import { GraphQLScalarType } from "graphql";

interface GqlVariableType {
  name: string;
  text?: string;
  value: VariableValueType;
  group?: string;
}

function mapVariablesToGql(variables: Variable[]): GqlVariableType[] {
  return variables.map(v => ({ name: v.name, text: v.text, value: v.value, group: v.group }));
}

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
      return mapVariablesToGql(store.variables);
    },
  },
  Mutation: {
    setVariableValue(_parent, { name, value }: { name: string; value: VariableValueType }): GqlVariableType {
      const variable = store.variables.find(v => v.name === name);
      if (!variable) throw new ApolloError("Variable not found!");

      variable.value = value;
      return mapVariablesToGql([variable])[0];
    },
  },
};

export default variablesResolvers;
