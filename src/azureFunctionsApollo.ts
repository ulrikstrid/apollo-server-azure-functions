import {
  HttpContext,
  IFunctionRequest,
  HttpStatusCodes
} from "azure-functions-typescript";
import { GraphQLOptions, runHttpQuery } from "apollo-server-core";
import * as GraphiQL from "apollo-server-module-graphiql";

export interface AzureFunctionsGraphQLOptionsFunction {
  (context: HttpContext): GraphQLOptions | Promise<GraphQLOptions>;
}

export interface AzureFunctionsHandler {
  (context: HttpContext, request: IFunctionRequest): void;
}

export interface IHeaders {
  "content-type"?: string;
  "content-length"?: HttpStatusCodes | number;
  "content-disposition"?: string;
  "content-encoding"?: string;
  "content-language"?: string;
  "content-range"?: string;
  "content-location"?: string;
  "content-md5"?: Buffer;
  "expires"?: Date;
  "last-modified"?: Date;
  [header: string]: any;
}

export interface AzureFunctionsGraphiQLOptionsFunction {
  (context: HttpContext):
    | GraphiQL.GraphiQLData
    | Promise<GraphiQL.GraphiQLData>;
}

export function graphqlAzureFunctions(
  options: GraphQLOptions | AzureFunctionsGraphQLOptionsFunction
): AzureFunctionsHandler {
  if (!options) {
    throw new Error("Apollo Server requires options.");
  }

  if (arguments.length > 1) {
    throw new Error(
      `Apollo Server expects exactly one argument, got ${arguments.length}`
    );
  }

  return async (httpContext: HttpContext, request: IFunctionRequest) => {
    let query = request.method === "POST" ? request.body : request.query,
      statusCode: number = null,
      gqlResponse = null,
      headers: { [headerName: string]: string } = {};

    if (query && typeof query === "string") {
      query = JSON.parse(query);
    }

    try {
      gqlResponse = await runHttpQuery([httpContext, request], {
        method: request.method,
        options: options,
        query: query
      });
      headers["Content-Type"] = "application/json";
      statusCode = 200;
    } catch (error) {
      if ("HttpQueryError" !== error.name) {
        throw error;
      }

      headers = error.headers;
      statusCode = error.statusCode;
      gqlResponse = error.message;
    } finally {
      httpContext.done(null, {
        status: statusCode,
        headers: headers,
        body: gqlResponse
      });
    }
  };
}

/* This Azure Functions Handler returns the html for the GraphiQL interactive query UI
 *
 * GraphiQLData arguments
 *
 * - endpointURL: the relative or absolute URL for the endpoint which GraphiQL will make queries to
 * - (optional) query: the GraphQL query to pre-fill in the GraphiQL UI
 * - (optional) variables: a JS object of variables to pre-fill in the GraphiQL UI
 * - (optional) operationName: the operationName to pre-fill in the GraphiQL UI
 * - (optional) result: the result of the query to pre-fill in the GraphiQL UI
 */

export function graphiqlAzureFunctions(
  options: GraphiQL.GraphiQLData | AzureFunctionsGraphiQLOptionsFunction
) {
  return (httpContext: HttpContext, request: IFunctionRequest) => {
    const query = request.query;
    GraphiQL.resolveGraphiQLString(query, options, httpContext, request).then(
      graphiqlString => {
        httpContext.done(null, {
          statusCode: 200,
          headers: {
            "Content-Type": "text/html"
          },
          body: graphiqlString
        });
      },
      error => {
        httpContext.done(null, {
          statusCode: 500,
          body: error.message
        });
      }
    );
  };
}
