import { MetadataCache, Notice, TFile, Vault } from "obsidian";
import { Base64 } from "js-base64";
import DigitalGardenSettings from "../models/settings";
import { PublishFile } from "../publishFile/PublishFile";
import Logger from "js-logger";
import { RepositoryConnection } from "../repositoryConnection/RepositoryConnection";

/**
 * Prepares files to be published and publishes them to Github
 */
export default class Publisher {
	vault: Vault;
	metadataCache: MetadataCache;
	settings: DigitalGardenSettings;

	constructor(
		vault: Vault,
		metadataCache: MetadataCache,
		settings: DigitalGardenSettings,
	) {
		this.vault = vault;
		this.metadataCache = metadataCache;
		this.settings = settings;
	}

	shouldPublish(file: TFile): boolean {
		const { publishFolderPath } = this.settings;

		return file.path.startsWith(publishFolderPath);
	}

	async getFilesForPublishing(): Promise<PublishFile[]> {
		const files = this.vault.getMarkdownFiles();
		const notesToPublish: PublishFile[] = [];

		for (const file of files) {
			try {
				if (this.shouldPublish(file)) {
					const publishFile = new PublishFile({
						file,
						vault: this.vault,
						metadataCache: this.metadataCache,
						settings: this.settings,
					});

					notesToPublish.push(publishFile);
				}
			} catch (e) {
				Logger.error(e);
			}
		}

		return notesToPublish.sort((a, b) => a.compare(b));
	}

	async getRemoteContentTree() {
		const userGardenConnection = new RepositoryConnection(this.settings);

		return await userGardenConnection.getContent("HEAD");
	}

	async deleteNote(vaultFilePath: string, sha?: string) {
		const { notePathBase } = this.settings;

		const path = `${notePathBase}${vaultFilePath}`;

		return await this.delete(path, sha);
	}
	/** If provided with sha, garden connection does not need to get it seperately! */
	public async delete(path: string, sha?: string): Promise<boolean> {
		this.validateSettings();

		const userGardenConnection = new RepositoryConnection(this.settings);

		const deleted = await userGardenConnection.deleteFile(path, {
			sha,
		});

		return !!deleted;
	}

	public async publish(file: PublishFile): Promise<boolean> {
		if (!this.shouldPublish(file.file)) {
			new Notice("Note should not be published.");

			return false;
		}

		try {
			await this.uploadText(
				file.getPath(),
				await file.cachedRead(),
				file?.remoteHash,
			);

			return true;
		} catch (error) {
			console.error(error);

			return false;
		}
	}

	public async publishBatch(files: PublishFile[]): Promise<boolean> {
		const filesToPublish = files.filter((f) => this.shouldPublish(f.file));

		if (filesToPublish.length === 0) {
			return true;
		}

		try {
			const userGardenConnection = new RepositoryConnection(
				this.settings,
			);

			await userGardenConnection.updateFiles(filesToPublish);

			return true;
		} catch (error) {
			console.error(error);

			return false;
		}
	}

	private async uploadToGithub(
		path: string,
		content: string,
		remoteFileHash?: string,
	) {
		this.validateSettings();
		let message = `Update content ${path}`;

		const userGardenConnection = new RepositoryConnection(this.settings);

		if (!remoteFileHash) {
			const file = await userGardenConnection.getFile(path).catch(() => {
				// file does not exist
				Logger.info(`File ${path} does not exist, adding`);
			});
			remoteFileHash = file?.sha;

			if (!remoteFileHash) {
				message = `Add content ${path}`;
			}
		}

		return await userGardenConnection.updateFile({
			content,
			path,
			message,
			sha: remoteFileHash,
		});
	}

	private async uploadText(filePath: string, content: string, sha?: string) {
		content = Base64.encode(content);
		const { notePathBase } = this.settings;
		const path = `${notePathBase}${filePath}`;
		await this.uploadToGithub(path, content, sha);
	}

	validateSettings() {
		if (!this.settings.githubRepo) {
			new Notice(
				"Config error: You need to define a GitHub repo in the plugin settings",
			);
			throw {};
		}

		if (!this.settings.githubUserName) {
			new Notice(
				"Config error: You need to define a GitHub Username in the plugin settings",
			);
			throw {};
		}

		if (!this.settings.githubToken) {
			new Notice(
				"Config error: You need to define a GitHub Token in the plugin settings",
			);
			throw {};
		}
	}
}
