/**
 * SEARCH-001: Search Index Management
 *
 * Provides in-memory search index creation, update, deletion,
 * and document indexing with field definitions and weights.
 */

import { v4Fallback } from './utils';
import {
  IndexDefinition,
  IndexDefinitionSchema,
  IndexField,
  IndexedDocument,
  IndexedDocumentSchema,
} from './types';

export interface CreateIndexInput {
  name: string;
  fields: IndexField[];
  settings?: IndexDefinition['settings'];
}

export interface IndexStats {
  indexId: string;
  name: string;
  documentCount: number;
  fieldCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class SearchIndexManager {
  private indices: Map<string, IndexDefinition> = new Map();
  private documents: Map<string, Map<string, IndexedDocument>> = new Map();

  /**
   * Create a new search index with the given field definitions.
   */
  createIndex(input: CreateIndexInput): IndexDefinition {
    const now = new Date();
    const id = v4Fallback();

    const definition = IndexDefinitionSchema.parse({
      id,
      name: input.name,
      fields: input.fields,
      createdAt: now,
      updatedAt: now,
      documentCount: 0,
      settings: input.settings,
    });

    if (this.findIndexByName(input.name)) {
      throw new Error(`Index with name "${input.name}" already exists`);
    }

    this.indices.set(id, definition);
    this.documents.set(id, new Map());
    return definition;
  }

  /**
   * Retrieve an index by its ID.
   */
  getIndex(indexId: string): IndexDefinition | undefined {
    return this.indices.get(indexId);
  }

  /**
   * Find an index by name.
   */
  findIndexByName(name: string): IndexDefinition | undefined {
    for (const index of this.indices.values()) {
      if (index.name === name) return index;
    }
    return undefined;
  }

  /**
   * Update an existing index's fields or settings.
   */
  updateIndex(indexId: string, updates: Partial<Pick<CreateIndexInput, 'fields' | 'settings'>>): IndexDefinition {
    const existing = this.indices.get(indexId);
    if (!existing) {
      throw new Error(`Index "${indexId}" not found`);
    }

    const updated = IndexDefinitionSchema.parse({
      ...existing,
      fields: updates.fields ?? existing.fields,
      settings: updates.settings !== undefined ? updates.settings : existing.settings,
      updatedAt: new Date(),
    });

    this.indices.set(indexId, updated);
    return updated;
  }

  /**
   * Delete an index and all its documents.
   */
  deleteIndex(indexId: string): boolean {
    if (!this.indices.has(indexId)) {
      return false;
    }
    this.indices.delete(indexId);
    this.documents.delete(indexId);
    return true;
  }

  /**
   * List all indices.
   */
  listIndices(): IndexDefinition[] {
    return Array.from(this.indices.values());
  }

  /**
   * Get stats for an index.
   */
  getIndexStats(indexId: string): IndexStats | undefined {
    const index = this.indices.get(indexId);
    if (!index) return undefined;

    return {
      indexId: index.id,
      name: index.name,
      documentCount: index.documentCount,
      fieldCount: index.fields.length,
      createdAt: index.createdAt,
      updatedAt: index.updatedAt,
    };
  }

  /**
   * Index a document, validating fields against the index definition.
   */
  indexDocument(indexId: string, docId: string, fields: Record<string, unknown>): IndexedDocument {
    const index = this.indices.get(indexId);
    if (!index) {
      throw new Error(`Index "${indexId}" not found`);
    }

    const indexDocs = this.documents.get(indexId)!;
    const validFieldNames = new Set(index.fields.map(f => f.name));

    // Validate that document fields match index definition
    for (const fieldName of Object.keys(fields)) {
      if (!validFieldNames.has(fieldName)) {
        throw new Error(`Field "${fieldName}" is not defined in index "${index.name}"`);
      }
    }

    const doc = IndexedDocumentSchema.parse({
      id: docId,
      indexId,
      fields,
      indexedAt: new Date(),
    });

    const isNew = !indexDocs.has(docId);
    indexDocs.set(docId, doc);

    if (isNew) {
      const updated = { ...index, documentCount: index.documentCount + 1, updatedAt: new Date() };
      this.indices.set(indexId, updated);
    }

    return doc;
  }

  /**
   * Remove a document from an index.
   */
  removeDocument(indexId: string, docId: string): boolean {
    const index = this.indices.get(indexId);
    if (!index) {
      throw new Error(`Index "${indexId}" not found`);
    }

    const indexDocs = this.documents.get(indexId)!;
    if (!indexDocs.has(docId)) {
      return false;
    }

    indexDocs.delete(docId);
    const updated = {
      ...index,
      documentCount: Math.max(0, index.documentCount - 1),
      updatedAt: new Date(),
    };
    this.indices.set(indexId, updated);
    return true;
  }

  /**
   * Retrieve a document by ID.
   */
  getDocument(indexId: string, docId: string): IndexedDocument | undefined {
    return this.documents.get(indexId)?.get(docId);
  }

  /**
   * Get all documents in an index.
   */
  getAllDocuments(indexId: string): IndexedDocument[] {
    const docs = this.documents.get(indexId);
    if (!docs) {
      throw new Error(`Index "${indexId}" not found`);
    }
    return Array.from(docs.values());
  }

  /**
   * Bulk index multiple documents.
   */
  bulkIndex(
    indexId: string,
    documents: Array<{ id: string; fields: Record<string, unknown> }>
  ): { indexed: number; errors: Array<{ id: string; error: string }> } {
    const results = { indexed: 0, errors: [] as Array<{ id: string; error: string }> };

    for (const doc of documents) {
      try {
        this.indexDocument(indexId, doc.id, doc.fields);
        results.indexed++;
      } catch (err) {
        results.errors.push({
          id: doc.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return results;
  }
}
