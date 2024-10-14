import Publisher from "./Publisher";
import { generateBlobHash } from "../utils/utils";
import { PublishFile } from "../publishFile/PublishFile";
import { TRepositoryContent } from "src/repositoryConnection/RepositoryConnection";

/**
 *  Manages the publishing status of notes and images for a digital garden.
 */
export default class PublishStatusManager implements IPublishStatusManager {
	publisher: Publisher;
	constructor(publisher: Publisher) {
		this.publisher = publisher;
	}
	getDeletedNotePaths(): Promise<string[]> {
		throw new Error("Method not implemented.");
	}
	getDeletedImagesPaths(): Promise<string[]> {
		throw new Error("Method not implemented.");
	}

	async getPublishStatus(): Promise<PublishStatus> {
		const unpublishedNotes: Array<PublishFile> = [];
		const publishedNotes: Array<PublishFile> = [];
		const changedNotes: Array<PublishFile> = [];

		const contentTree = await this.publisher.getRemoteContentTree();

		if (!contentTree) {
			throw new Error("Could not get content tree from base garden");
		}

		const remoteNoteHashes = await this.getNoteHashes(contentTree);

		const notes = await this.publisher.getFilesForPublishing();

		for (const file of notes) {
			const content = await file.cachedRead();

			const localHash = generateBlobHash(content);
			const remoteHash = remoteNoteHashes[file.getPath()];

			if (!remoteHash) {
				unpublishedNotes.push(file);
			} else if (remoteHash === localHash) {
				file.setRemoteHash(remoteHash);
				publishedNotes.push(file);
			} else {
				file.setRemoteHash(remoteHash);
				changedNotes.push(file);
			}
		}

		const deletedNotePaths = this.generateDeletedContentPaths(
			remoteNoteHashes,
			notes.map((f) => f.getPath()),
		);

		// These might already be sorted, as getFilesMarkedForPublishing sorts already
		unpublishedNotes.sort((a, b) => a.compare(b));
		publishedNotes.sort((a, b) => a.compare(b));
		changedNotes.sort((a, b) => a.compare(b));
		deletedNotePaths.sort((a, b) => a.path.localeCompare(b.path));

		return {
			unpublishedNotes,
			publishedNotes,
			changedNotes,
			deletedNotePaths,
		};
	}

	private generateDeletedContentPaths(
		remoteNoteHashes: { [key: string]: string },
		marked: string[],
	): Array<{ path: string; sha: string }> {
		const isJsFile = (key: string) => key.endsWith(".js");

		const isMarkedForPublish = (key: string) =>
			marked.find((f) => f === key);

		const deletedPaths = Object.keys(remoteNoteHashes).filter(
			(key) => !isJsFile(key) && !isMarkedForPublish(key),
		);

		const pathsWithSha = deletedPaths.map((path) => {
			return {
				path,
				sha: remoteNoteHashes[path],
			};
		});

		return pathsWithSha;
	}

	async getNoteHashes(
		contentTree: NonNullable<TRepositoryContent>,
	): Promise<Record<string, string>> {
		const files = contentTree.tree;

		const { notePathBase } = this.publisher.settings;

		const notes = files.filter(
			(x): x is ContentTreeItem =>
				typeof x.path === "string" &&
				x.path.startsWith(notePathBase) &&
				x.type === "blob",
		);
		const hashes: Record<string, string> = {};

		for (const note of notes) {
			const vaultPath = note.path.replace(notePathBase, "");

			if (vaultPath.startsWith(".")) continue;
			hashes[vaultPath] = note.sha;
		}

		return hashes;
	}
}

interface PathToRemove {
	path: string;
	sha: string;
}

export interface PublishStatus {
	unpublishedNotes: Array<PublishFile>;
	publishedNotes: Array<PublishFile>;
	changedNotes: Array<PublishFile>;
	deletedNotePaths: Array<PathToRemove>;
}

export interface IPublishStatusManager {
	getPublishStatus(): Promise<PublishStatus>;
}

type ContentTreeItem = {
	path: string;
	sha: string;
	type: string;
};
