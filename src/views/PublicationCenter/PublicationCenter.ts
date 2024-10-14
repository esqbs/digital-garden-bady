import { type App, Modal, getIcon, Vault, TFile } from "obsidian";
import DigitalGardenSettings from "../../models/settings";
import { PublishFile } from "../../publishFile/PublishFile";
import PublishStatusManager from "../../publisher/PublishStatusManager";
import Publisher from "../../publisher/Publisher";
import PublicationCenterSvelte from "./PublicationCenter.svelte";
import DiffView from "./DiffView.svelte";
import * as Diff from "diff";
import { Base64 } from "js-base64";
import { RepositoryConnection } from "src/repositoryConnection/RepositoryConnection";

export class PublicationCenter {
	modal: Modal;
	settings: DigitalGardenSettings;
	publishStatusManager: PublishStatusManager;
	publisher: Publisher;
	vault: Vault;

	publicationCenterUi!: PublicationCenterSvelte;

	constructor(
		app: App,
		publishStatusManager: PublishStatusManager,
		publisher: Publisher,
		settings: DigitalGardenSettings,
	) {
		this.modal = new Modal(app);
		this.settings = settings;
		this.publishStatusManager = publishStatusManager;
		this.publisher = publisher;
		this.vault = app.vault;

		this.modal.titleEl
			.createEl("span", { text: "Publication Center" })
			.prepend(this.getIcon("book-up"));
	}

	getIcon(name: string): Node {
		const icon = getIcon(name) ?? document.createElement("span");

		if (icon instanceof SVGSVGElement) {
			icon.style.marginRight = "4px";
		}

		return icon;
	}

	async getNoteContent(path: string): Promise<string> {
		if (path.startsWith("/")) {
			path = path.substring(1);
		}

		const userGardenConnection = new RepositoryConnection(this.settings);

		const response = await userGardenConnection.getFile(
			this.settings.notePathBase + path,
		);

		if (!response) {
			return "";
		}

		const content = Base64.decode(response.content);

		return content;
	}

	private showDiff = async (notePath: string) => {
		try {
			const remoteContent = await this.getNoteContent(notePath);
			const localFile = this.vault.getAbstractFileByPath(notePath);

			const localPublishFile = new PublishFile({
				file: localFile as TFile,
				vault: this.vault,
				metadataCache: this.publisher.metadataCache,
				settings: this.settings,
			});

			if (localFile instanceof TFile) {
				const localContent = await localPublishFile.cachedRead();

				const diff = Diff.diffLines(remoteContent, localContent);
				let diffView: DiffView | undefined;
				const diffModal = new Modal(this.modal.app);

				diffModal.titleEl
					.createEl("span", { text: `${localFile.basename}` })
					.prepend(this.getIcon("file-diff"));

				diffModal.onOpen = () => {
					diffView = new DiffView({
						target: diffModal.contentEl,
						props: { diff: diff },
					});
				};

				this.modal.onClose = () => {
					if (diffView) {
						diffView.$destroy();
					}
				};

				diffModal.open();
			}
		} catch (e) {
			console.error(e);
		}
	};
	open = () => {
		this.modal.onClose = () => {
			this.publicationCenterUi.$destroy();
		};

		this.modal.onOpen = () => {
			this.modal.contentEl.empty();

			this.publicationCenterUi = new PublicationCenterSvelte({
				target: this.modal.contentEl,
				props: {
					publishStatusManager: this.publishStatusManager,
					publisher: this.publisher,
					showDiff: this.showDiff,
					close: () => {
						this.modal.close();
					},
				},
			});
		};

		this.modal.open();
	};
}
