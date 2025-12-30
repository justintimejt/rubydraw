import { GraphQLClient } from 'graphql-request';

const endpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:3000/graphql';

export const graphqlClient = new GraphQLClient(endpoint);



