import { randomUUID } from "node:crypto";
import type { CatalogEntry } from "../../../src/schemas.js";
import { contentHash } from "./embed-cache.js";
import { ErrorCodes, SoukCompassError } from "./errors.js";
import {
	type SearchResult,
	SearchResultSchema,
	type SolrDocument,
	SolrDocumentSchema,
} from "./schemas.js";

/**
 * Build the embedding text for an artifact from its display name, description, and body.
 */
export function buildEmbeddingText(
	displayName: string,
	description: string,
	body: string,
): string {
	return `${displayName}: ${description}\n\n${body}`;
}

/**
 * Convert a catalog entry, its text content, and embedding into a Solr JSON document.
 * Validates output against SolrDocumentSchema before returning.
 */
export function toSolrDocument(
	entry: CatalogEntry,
	text: string,
	embedding: number[],
): SolrDocument {
	const doc: SolrDocument = {
		id: entry.name,
		text,
		vector: embedding,
		artifact_name: entry.name,
		artifact_type: entry.type,
		display_name: entry.displayName,
		maturity: entry.maturity,
		collection_names: entry.collections.join(","),
		keywords: entry.keywords.join(","),
		author: entry.author,
		version: entry.version,
		doc_source: "artifact",
		content_hash: contentHash(text),
	};

	return SolrDocumentSchema.parse(doc);
}

/**
 * Parse a raw Solr response document into a typed SearchResult.
 * Validates output against SearchResultSchema; throws SoukCompassError on failure.
 */
export function fromSolrDocument(doc: Record<string, unknown>): SearchResult {
	const text = typeof doc.text === "string" ? doc.text : "";
	const collectionNames =
		typeof doc.collection_names === "string" && doc.collection_names !== ""
			? doc.collection_names.split(",")
			: [];

	const result = {
		id: doc.id as string,
		artifactName: doc.artifact_name as string | undefined,
		displayName: doc.display_name as string | undefined,
		type: doc.artifact_type as string | undefined,
		score: typeof doc.score === "number" ? doc.score : 0,
		description: text.slice(0, 500),
		maturity: doc.maturity as string | undefined,
		collections: collectionNames,
		docSource: doc.doc_source as "artifact" | "user" | "memory",
		snippet: typeof doc.snippet === "string" ? doc.snippet : undefined,
		chunkIndex:
			typeof doc.chunk_index === "number" ? doc.chunk_index : undefined,
		parentArtifact:
			typeof doc.parent_artifact === "string" ? doc.parent_artifact : undefined,
	};

	try {
		return SearchResultSchema.parse(result);
	} catch (err) {
		throw new SoukCompassError(
			`Failed to deserialize Solr document: ${err instanceof Error ? err.message : String(err)}`,
			ErrorCodes.SERIALIZATION,
			{ cause: err },
		);
	}
}

/**
 * Convert a user document into Solr JSON format with doc_source set to "user".
 * Prefixes user metadata keys with "metadata_".
 */
export function toUserSolrDocument(
	id: string,
	text: string,
	embedding: number[],
	metadata?: Record<string, string>,
): SolrDocument {
	const doc: Record<string, unknown> = {
		id,
		text,
		vector: embedding,
		doc_source: "user",
	};

	if (metadata) {
		for (const [key, value] of Object.entries(metadata)) {
			doc[`metadata_${key}`] = value;
		}
	}

	return SolrDocumentSchema.parse(doc) as SolrDocument;
}

/**
 * Convert a memory note into Solr JSON format with doc_source set to "memory".
 * Generates a UUID for the document id and stores category, tags, created_at,
 * and optional session_id as metadata fields.
 */
export function toMemoryDocument(
	note: string,
	embedding: number[],
	category: string,
	tags?: string[],
	sessionId?: string,
): SolrDocument {
	const doc: Record<string, unknown> = {
		id: randomUUID(),
		text: note,
		vector: embedding,
		doc_source: "memory",
		metadata_category: category,
		metadata_tags: tags?.join(",") ?? "",
		metadata_created_at: new Date().toISOString(),
	};

	if (sessionId) {
		doc.metadata_session_id = sessionId;
	}

	return SolrDocumentSchema.parse(doc) as SolrDocument;
}
