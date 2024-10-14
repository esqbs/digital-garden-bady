import { Plugin, addIcon } from "obsidian";
import Publisher from "./src/publisher/Publisher";
import DigitalGardenSettings from "./src/models/settings";
import { seedling } from "src/ui/suggest/constants";
import { PublicationCenter } from "src/views/PublicationCenter/PublicationCenter";
import PublishStatusManager from "src/publisher/PublishStatusManager";
import { DigitalGardenSettingTab } from "./src/views/DigitalGardenSettingTab";
import Logger from "js-logger";

const DEFAULT_SETTINGS: DigitalGardenSettings = {
	githubRepo: "",
	githubToken: "",
	githubUserName: "",
	gardenBaseUrl: "",
	notePathBase: "",
	publishFolderPath: "",

	logLevel: undefined,
};

Logger.useDefaults({
	defaultLevel: Logger.WARN,
	formatter: function (messages, _context) {
		messages.unshift(new Date().toUTCString());
		messages.unshift("DG: ");
	},
});
export default class DigitalGarden extends Plugin {
	settings!: DigitalGardenSettings;
	appVersion!: string;

	publishModal!: PublicationCenter;

	async onload() {
		this.appVersion = this.manifest.version;

		console.log("Initializing DigitalGarden plugin v" + this.appVersion);
		await this.loadSettings();

		this.settings.logLevel && Logger.setLevel(this.settings.logLevel);

		Logger.info(
			"Digital garden log level set to " + Logger.getLevel().name,
		);
		this.addSettingTab(new DigitalGardenSettingTab(this.app, this));

		await this.addCommands();

		addIcon("digital-garden-icon", seedling);

		this.addRibbonIcon(
			"digital-garden-icon",
			"Digital Garden Publication Center",
			async () => {
				this.openPublishModal();
			},
		);
	}

	onunload() { }

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async addCommands() {
		this.addCommand({
			id: "dg-open-publish-modal",
			name: "Open Publication Center",
			callback: async () => {
				this.openPublishModal();
			},
		});
	}

	openPublishModal() {
		if (!this.publishModal) {
			const publisher = new Publisher(
				this.app.vault,
				this.app.metadataCache,
				this.settings,
			);

			const publishStatusManager = new PublishStatusManager(publisher);

			this.publishModal = new PublicationCenter(
				this.app,
				publishStatusManager,
				publisher,
				this.settings,
			);
		}
		this.publishModal.open();
	}
}
