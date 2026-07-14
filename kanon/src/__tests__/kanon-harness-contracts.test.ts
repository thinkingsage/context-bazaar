import { beforeAll, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import matter from "gray-matter";
import type nunjucks from "nunjucks";
import { claudeCodeAdapter } from "../adapters/claude-code";
import { CODEX_PROJECT_DOC_MAX_BYTES, codexAdapter } from "../adapters/codex";
import { kiroAdapter } from "../adapters/kiro";
import { parseKiroSteeringFile } from "../adapters/kiro-frontmatter";
import type { AdapterResult, OutputFile } from "../adapters/types";
import { isParseError, loadKnowledgeArtifact } from "../parser";
import type { KnowledgeArtifact } from "../schemas";
import { renderTemper } from "../temper";
import { createTemplateEnv } from "../template-engine";

const ROOT = resolve(import.meta.dir, "../..");
const TEMPLATES_DIR = resolve(ROOT, "templates/harness-adapters");
const KANON_DIR = resolve(ROOT, "knowledge/kanon");
const AGENT_SKILL_MAX_LINES = 500;
const AGENT_SKILL_MAX_DESCRIPTION_CHARS = 1024;

let artifact: KnowledgeArtifact;
let templateEnv: nunjucks.Environment;
let kiroResult: AdapterResult;
let claudeResult: AdapterResult;
let codexResult: AdapterResult;

function getFile(result: AdapterResult, relativePath: string): OutputFile {
	const file = result.files.find(
		(candidate) => candidate.relativePath === relativePath,
	);
	expect(file).toBeDefined();
	if (!file) throw new Error(`Missing generated file: ${relativePath}`);
	return file;
}

function expectValidAgentSkill(file: OutputFile, expectedName: string): void {
	const parsed = matter(file.content);
	const lines = file.content.split(/\r?\n/).length;

	expect(parsed.data.name).toBe(expectedName);
	expect(parsed.data.name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
	expect(parsed.data.name.length).toBeLessThanOrEqual(64);
	expect(typeof parsed.data.description).toBe("string");
	expect(parsed.data.description.length).toBeGreaterThan(0);
	expect(parsed.data.description.length).toBeLessThanOrEqual(
		AGENT_SKILL_MAX_DESCRIPTION_CHARS,
	);
	expect(parsed.data.keywords).toBeUndefined();
	expect(lines).toBeLessThan(AGENT_SKILL_MAX_LINES);
}

function expectProgressiveReferences(
	result: AdapterResult,
	skill: OutputFile,
	referencePrefix: string,
): void {
	for (const workflow of artifact.workflows) {
		const referencePath = `${referencePrefix}/${workflow.filename}`;
		const reference = getFile(result, referencePath);

		expect(skill.content).toContain(`references/${workflow.filename}`);
		expect(skill.content).not.toContain(workflow.content);
		expect(reference.content).toBe(workflow.content);
	}
}

beforeAll(async () => {
	templateEnv = createTemplateEnv(TEMPLATES_DIR);
	const loaded = await loadKnowledgeArtifact(KANON_DIR);
	if (isParseError(loaded)) {
		throw new Error(
			`Unable to load Kanon artifact: ${JSON.stringify(loaded.errors)}`,
		);
	}
	artifact = loaded.data;
	kiroResult = kiroAdapter(artifact, templateEnv);
	claudeResult = claudeCodeAdapter(artifact, templateEnv);
	codexResult = codexAdapter(artifact, templateEnv);
});

describe("Kanon harness consumption contracts", () => {
	test("Kiro emits a focused power with manual, frontmatter-valid workflows", () => {
		const power = getFile(kiroResult, "POWER.md");
		const powerFrontmatter = matter(power.content).data;

		expect(powerFrontmatter.name).toBe("kanon");
		expect(powerFrontmatter.description).toBe(artifact.frontmatter.description);
		expect(kiroResult.warnings).toEqual([]);

		for (const workflow of artifact.workflows) {
			expect(power.content).not.toContain(workflow.content);
			const steering = getFile(kiroResult, `steering/${workflow.filename}`);
			const parsed = parseKiroSteeringFile(steering.content, workflow.filename);
			expect(parsed.ok).toBe(true);
			if (!parsed.ok) throw new Error(parsed.message);
			expect(steering.content.startsWith("---\n")).toBe(true);
			expect(parsed.frontmatter?.inclusion).toBe("manual");
		}
	});

	test("Claude emits a spec-valid, sub-500-line skill with on-demand references", () => {
		const skillPath = ".claude/skills/kanon/SKILL.md";
		const skill = getFile(claudeResult, skillPath);

		expectValidAgentSkill(skill, "kanon");
		expectProgressiveReferences(
			claudeResult,
			skill,
			".claude/skills/kanon/references",
		);
		expect(claudeResult.warnings).toEqual([]);
	});

	test("Codex keeps AGENTS.md under 32 KiB and detail in a native skill", () => {
		const agents = getFile(codexResult, "AGENTS.md");
		const skill = getFile(codexResult, ".agents/skills/kanon/SKILL.md");
		const agentsSize = new TextEncoder().encode(agents.content).byteLength;

		expect(agentsSize).toBeLessThanOrEqual(CODEX_PROJECT_DOC_MAX_BYTES);
		expect(agents.content).toContain(".agents/skills/kanon/SKILL.md");
		expectValidAgentSkill(skill, "kanon");
		expectProgressiveReferences(
			codexResult,
			skill,
			".agents/skills/kanon/references",
		);
		expect(codexResult.warnings).toEqual([]);
	});

	test("Temper reports no workflow degradation for native reference bundles", async () => {
		for (const harness of ["claude-code", "codex"] as const) {
			const output = await renderTemper({
				artifactName: "kanon",
				harness,
				knowledgeDirs: [resolve(ROOT, "knowledge")],
				templatesDir: TEMPLATES_DIR,
			});

			expect(output.degradations).not.toContain("workflows: inline");
		}
	});
});
