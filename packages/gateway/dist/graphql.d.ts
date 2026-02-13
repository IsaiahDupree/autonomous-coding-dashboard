import { ServiceDefinition } from './types';
export interface QueryPlan {
    operations: QueryOperation[];
}
export interface QueryOperation {
    serviceName: string;
    serviceUrl: string;
    selectionSet: string;
}
export interface ExecutionResult {
    data: Record<string, unknown> | null;
    errors?: GraphQLError[];
}
export interface GraphQLError {
    message: string;
    locations?: Array<{
        line: number;
        column: number;
    }>;
    path?: Array<string | number>;
    extensions?: Record<string, unknown>;
}
export interface ExecutionContext {
    apiKeyId?: string;
    userId?: string;
    orgId?: string;
    headers?: Record<string, string>;
}
export interface GraphQLGatewayOptions {
    services: ServiceDefinition[];
    playground?: boolean;
}
/**
 * Lightweight GraphQL gateway stub implementing schema stitching.
 *
 * This provides the framework for a federated GraphQL gateway.
 * Actual GraphQL parsing and execution would require graphql-js at runtime.
 * This implementation provides:
 * - Service registration and schema merging
 * - Query planning (field-to-service routing)
 * - Introspection schema generation
 */
export declare class GraphQLGateway {
    private readonly services;
    private readonly playgroundEnabled;
    private readonly fieldOwnership;
    private mergedSchema;
    constructor(options: GraphQLGatewayOptions);
    /**
     * Build a unified schema by merging all service schemas.
     * Uses a simple SDL merging approach: concatenates type definitions
     * and tracks field ownership for query routing.
     */
    buildSchema(): string;
    /**
     * Execute a GraphQL query by routing to appropriate services.
     *
     * This is a stub that demonstrates the query planning approach.
     * Full implementation would require graphql-js for parsing and execution.
     */
    execute(query: string, variables?: Record<string, unknown>, context?: ExecutionContext): Promise<ExecutionResult>;
    /**
     * Return the merged schema for client introspection.
     */
    introspect(): string;
    /**
     * Check if the playground is enabled.
     */
    isPlaygroundEnabled(): boolean;
    /**
     * Get all registered services.
     */
    getServices(): ServiceDefinition[];
    /**
     * Register a new service.
     */
    registerService(service: ServiceDefinition): void;
    /**
     * Remove a service.
     */
    removeService(name: string): void;
    /**
     * Plan a query by parsing the requested fields and mapping them to services.
     * This is a simplified implementation; a production version would use
     * a full GraphQL parser.
     */
    private planQuery;
    /**
     * Execute a sub-query against a specific service.
     * In a production implementation, this would make an HTTP request
     * to the service's GraphQL endpoint.
     */
    private executeOnService;
    /**
     * Parse SDL into type definitions (simplified parser).
     * Extracts type names and their fields from GraphQL SDL.
     */
    private parseSDL;
}
//# sourceMappingURL=graphql.d.ts.map