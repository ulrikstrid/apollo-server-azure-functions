# apollo-server-azure-functions 

## Work in progress

This still needs tests and should be made in to a PR against the main repo where the rest of the bindings are.

## Example:

```js
const server = require("@ulrikstrid/apollo-server-azure-functions");
const graphqlTools = require("graphql-tools");

const typeDefs = `
  type Random {
    id: Int!
    rand: String
  }

  type Query {
    rands: [Random]
    rand(id: Int!): Random
  }
`;

const rands = [{ id: 1, rand: "random" }, { id: 2, rand: "modnar" }];

const resolvers = {
  Query: {
    rands: () => rands,
    rand: (_, { id }) => rands.find(rand => rand.id === id)
  }
};

const schema = graphqlTools.makeExecutableSchema({
  typeDefs,
  resolvers
});

module.exports = function run(context, request) {
  if (request.method === "POST") {
    server.graphqlAzureFunctions({
        endpointURL: '/api/get'
    })(context, request);
  } else if (request.method === "GET") {
    return server.graphiqlAzureFunctions({
        endpointURL: '/api/get'
    })(context, request);
  }
};
```