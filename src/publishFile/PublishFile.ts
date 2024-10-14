import { MetadataCache, TFile, Vault } from "obsidian";
import DigitalGardenSettings from "../models/settings";

interface IPublishFileProps {
	file: TFile;
	vault: Vault;
	metadataCache: MetadataCache;
	settings: DigitalGardenSettings;
}

export class PublishFile {
	file: TFile;
	vault: Vault;
	metadataCache: MetadataCache;
	settings: DigitalGardenSettings;
	frontmatter: Record<string, unknown>;
	remoteHash?: string;

	constructor({ file, metadataCache, vault, settings }: IPublishFileProps) {
		this.metadataCache = metadataCache;
		this.file = file;
		this.settings = settings;
		this.vault = vault;
		this.frontmatter = this.getFrontmatter();
	}

	shouldPublish(): boolean {
		const { publishFolderPath } = this.settings;

		return this.file.path.startsWith(publishFolderPath);
	}

	async cachedRead() {
		return this.vault.cachedRead(this.file);
	}

	getMetadata() {
		return this.metadataCache.getCache(this.file.path) ?? {};
	}

	getBlock(blockId: string) {
		return this.getMetadata().blocks?.[blockId];
	}

	getFrontmatter() {
		return this.metadataCache.getCache(this.file.path)?.frontmatter ?? {};
	}

	/** Add other possible sorting logic here, eg if we add dg-sortWeight
	 * We might also want to sort by meta.getPath for rewritten garden path
	 */
	compare(other: PublishFile) {
		return this.file.path.localeCompare(other.file.path);
	}

	getPath = () => this.file.path;

	setRemoteHash(hash: string) {
		this.remoteHash = hash;
	}
}
