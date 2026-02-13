import { ServiceDefinition } from './types';

// ─── Query Plan Types ────────────────────────────────────────────────────────

export interface QueryPlan {
  operations: QueryOperation[];
}

export interface QueryOperation {
  serviceName: string;
  serviceUrl: string;
  selectionSet: string;
}

// ─── Schema Field Mapping ────────────────────────────────────────────────────

interface FieldOwnership {
  typeName: string;
  fieldName: string;
  serviceName: string;
}

// ─── Execution Result ────────────────────────────────────────────────────────

export interface ExecutionResult {
  data: Record<string, unknown> | null;
  errors?: GraphQLError[];
}

export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

// ─── Execution Context ───────────────────────────────────────────────────────

export interface ExecutionContext {
  apiKeyId?: string;
  userId?: string;
  orgId?: string;
  headers?: Record<string, string>;
}

// ─── GraphQL Gateway Options ─────────────────────────────────────────────────

export interface GraphQLGatewayOptions {
  services: ServiceDefinition[];
  playground?: boolean;
}

// ─── GraphQL Gateway ─────────────────────────────────────────────────────────

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
export class GraphQLGateway {
  private readonly services: Map<string, ServiceDefinition> = new Map();
  private readonly playgroundEnabled: boolean;
  private readonly fieldOwnership: FieldOwnership[] = [];
  private mergedSchema: string | null = null;

  constructor(options: GraphQLGatewayOptions) {
    this.playgroundEnabled = options.playground ?? false;
    for (const service of options.services) {
      this.services.set(service.name, service);
    }
  }

  /**
   * Build a unified schema by merging all service schemas.
   * Uses a simple SDL merging approach: concatenates type definitions
   * and tracks field ownership for query routing.
   */
  buildSchema(): string {
    const typeDefinitions: Map<string, Map<string, { field: string; serviceName: string }>> =
      new Map();

    for (const [serviceName, service] of this.services) {
      const types = this.parseSDL(service.sdl);

      for (const typeDef of types) {
        if (!typeDefinitions.has(typeDef.name)) {
          typeDefinitions.set(typeDef.name, new Map());
        }

        const fields = typeDefinitions.get(typeDef.name)!;
        for (const field of typeDef.fields) {
          fields.set(field.name, { field: field.raw, serviceName });

          this.fieldOwnership.push({
            typeName: typeDef.name,
            fieldName: field.name,
            serviceName,
          });
        }
      }
    }

    // Generate merged SDL
    const parts: string[] = [];
    for (const [typeName, fields] of typeDefinitions) {
      const fieldDefs = Array.from(fields.values())
        .map((f) => `  ${f.field}`)
        .join('\n');
      parts.push(`type ${typeName} {\n${fieldDefs}\n}`);
    }

    this.mergedSchema = parts.join('\n\n');
    return this.mergedSchema;
  }

  /**
   * Execute a GraphQL query by routing to appropriate services.
   *
   * This is a stub that demonstrates the query planning approach.
   * Full implementation would require graphql-js for parsing and execution.
   */
  async execute(
    query: string,
    variables?: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutionResult> {
    if (!this.mergedSchema) {
      this.buildSchema();
    }

    // Plan the query: determine which services need to be called
    const plan = this.planQuery(query);

    if (plan.operations.length === 0) {
      return {
        data: null,
        errors: [{ message: 'No service could handle the requested fields' }],
      };
    }

    // Execute sub-queries against each service
    const results = await Promise.allSettled(
      plan.operations.map((op) => this.executeOnService(op, variables, context))
    );

    // Merge results
    const mergedData: Record<string, unknown> = {};
    const errors: GraphQLError[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.data) {
          Object.assign(mergedData, result.value.data);
        }
        if (result.value.errors) {
          errors.push(...result.value.errors);
        }
      } else {
        errors.push({
          message: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    }

    return {
      data: Object.keys(mergedData).length > 0 ? mergedData : null,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Return the merged schema for client introspection.
   */
  introspect(): string {
    if (!this.mergedSchema) {
      this.buildSchema();
    }
    return this.mergedSchema!;
  }

  /**
   * Check if the playground is enabled.
   */
  isPlaygroundEnabled(): boolean {
    return this.playgroundEnabled;
  }

  /**
   * Get all registered services.
   */
  getServices(): ServiceDefinition[] {
    return Array.from(this.services.values());
  }

  /**
   * Register a new service.
   */
  registerService(service: ServiceDefinition): void {
    this.services.set(service.name, service);
    // Invalidate merged schema so it gets rebuilt
    this.mergedSchema = null;
    // Clear field ownership to rebuild
    this.fieldOwnership.length = 0;
  }

  /**
   * Remove a service.
   */
  removeService(name: string): void {
    this.services.delete(name);
    this.mergedSchema = null;
    this.fieldOwnership.length = 0;
  }

  /**
   * Plan a query by parsing the requested fields and mapping them to services.
   * This is a simplified implementation; a production version would use
   * a full GraphQL parser.
   */
  private planQuery(query: string): QueryPlan {
    const operations: QueryOperation[] = [];
    const serviceSelections: Map<string, string[]> = new Map();

    // Simple field extraction from query (stub parser)
    // Looks for top-level field names in the query body
    const fieldPattern = /\{\s*([\s\S]*?)\s*\}/;
    const match = query.match(fieldPattern);

    if (match) {
      const body = match[1];
      // Extract top-level field names (simplified)
      const fieldNames = body
        .split(/[\n,]/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && !line.startsWith('}'))
        .map((line) => {
          // Extract field name (before arguments or sub-selection)
          const fieldMatch = line.match(/^(\w+)/);
          return fieldMatch ? fieldMatch[1] : null;
        })
        .filter((name): name is string => name !== null);

      // Map fields to services
      for (const fieldName of fieldNames) {
        const owner = this.fieldOwnership.find(
          (fo) => fo.typeName === 'Query' && fo.fieldName === fieldName
        );

        if (owner) {
          if (!serviceSelections.has(owner.serviceName)) {
            serviceSelections.set(owner.serviceName, []);
          }
          serviceSelections.get(owner.serviceName)!.push(fieldName);
        }
      }
    }

    // Build operations for each service
    for (const [serviceName, fields] of serviceSelections) {
      const service = this.services.get(serviceName);
      if (service) {
        operations.push({
          serviceName,
          serviceUrl: service.url,
          selectionSet: fields.join(', '),
        });
      }
    }

    return { operations };
  }

  /**
   * Execute a sub-query against a specific service.
   * In a production implementation, this would make an HTTP request
   * to the service's GraphQL endpoint.
   */
  private async executeOnService(
    operation: QueryOperation,
    _variables?: Record<string, unknown>,
    _context?: ExecutionContext
  ): Promise<ExecutionResult> {
    // Stub: In production, this would be an HTTP POST to operation.serviceUrl
    // with the sub-query and variables.
    return {
      data: null,
      errors: [
        {
          message: `Service "${operation.serviceName}" at ${operation.serviceUrl} - execution requires graphql-js runtime`,
          extensions: {
            code: 'STUB_IMPLEMENTATION',
            serviceName: operation.serviceName,
            selectionSet: operation.selectionSet,
          },
        },
      ],
    };
  }

  /**
   * Parse SDL into type definitions (simplified parser).
   * Extracts type names and their fields from GraphQL SDL.
   */
  private parseSDL(
    sdl: string
  ): Array<{ name: string; fields: Array<{ name: string; raw: string }> }> {
    const types: Array<{ name: string; fields: Array<{ name: string; raw: string }> }> = [];

    // Match type definitions: type TypeName { ... }
    const typePattern = /type\s+(\w+)\s*\{([^}]*)\}/g;
    let typeMatch: RegExpExecArray | null;

    while ((typeMatch = typePattern.exec(sdl)) !== null) {
      const typeName = typeMatch[1];
      const body = typeMatch[2];

      const fields: Array<{ name: string; raw: string }> = [];

      // Extract field definitions
      const lines = body.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const fieldMatch = trimmed.match(/^(\w+)/);
        if (fieldMatch) {
          fields.push({
            name: fieldMatch[1],
            raw: trimmed,
          });
        }
      }

      types.push({ name: typeName, fields });
    }

    return types;
  }
}
