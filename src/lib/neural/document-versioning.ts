/**
 * ─── v21: Document Versioning (Git-like Episodic Memory) ───
 * Auto-snapshot on significant changes, word-level diff, consolidation.
 * 
 * Analogy: Hippocampal episodic memory with consolidation to neocortex.
 */

export interface DocumentVersion {
  id: string;
  content: string;
  timestamp: number;
  changePercentage: number;
  label?: string;
}

export interface WordDiff {
  type: "added" | "removed" | "unchanged";
  text: string;
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(/\s+/));
  const setB = new Set(b.split(/\s+/));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 1 : intersection.size / union.size;
}

export class DocumentVersionManager {
  private versions: DocumentVersion[] = [];
  private changeThreshold: number;

  constructor(changeThreshold: number = 0.01) {
    this.changeThreshold = changeThreshold;
  }

  createSnapshot(content: string, label?: string): DocumentVersion | null {
    const lastVersion = this.versions[this.versions.length - 1];
    if (lastVersion) {
      const similarity = jaccardSimilarity(lastVersion.content, content);
      const changePercentage = 1 - similarity;
      if (changePercentage < this.changeThreshold) return null;

      const version: DocumentVersion = {
        id: `v-${Date.now()}`,
        content,
        timestamp: Date.now(),
        changePercentage,
        label,
      };
      this.versions.push(version);
      return version;
    }

    const version: DocumentVersion = {
      id: `v-${Date.now()}`,
      content,
      timestamp: Date.now(),
      changePercentage: 1,
      label: label || "Initial version",
    };
    this.versions.push(version);
    return version;
  }

  computeDiff(versionA: string, versionB: string): WordDiff[] {
    const wordsA = versionA.split(/\s+/);
    const wordsB = versionB.split(/\s+/);
    const diffs: WordDiff[] = [];
    const setA = new Set(wordsA);
    const setB = new Set(wordsB);

    for (const word of wordsA) {
      diffs.push({ type: setB.has(word) ? "unchanged" : "removed", text: word });
    }
    for (const word of wordsB) {
      if (!setA.has(word)) {
        diffs.push({ type: "added", text: word });
      }
    }
    return diffs;
  }

  consolidate(): void {
    if (this.versions.length < 3) return;
    const consolidated: DocumentVersion[] = [this.versions[0]];
    for (let i = 1; i < this.versions.length; i++) {
      const prev = consolidated[consolidated.length - 1];
      const curr = this.versions[i];
      const similarity = jaccardSimilarity(prev.content, curr.content);
      if (similarity < 0.95) {
        consolidated.push(curr);
      }
    }
    this.versions = consolidated;
  }

  restore(versionId: string): string | null {
    const version = this.versions.find(v => v.id === versionId);
    return version?.content || null;
  }

  getTimeline(): Array<{ id: string; timestamp: number; changePercentage: number; label?: string }> {
    return this.versions.map(({ id, timestamp, changePercentage, label }) => ({
      id, timestamp, changePercentage, label,
    }));
  }

  getVersionCount(): number {
    return this.versions.length;
  }
}
