import { App, debounce, getIcon, Setting, Debouncer } from "obsidian";

import DigitalGardenSettings from "../../models/settings";
import { GithubSettings } from "./GithubSettings";

export default class SettingView {
	private app: App;
	settings: DigitalGardenSettings;
	saveSettings: Debouncer<[], Promise<void>>;
	private settingsRootElement: HTMLElement;

	constructor(
		app: App,
		settingsRootElement: HTMLElement,
		settings: DigitalGardenSettings,
		saveSettings: () => Promise<void>,
	) {
		this.app = app;
		this.settingsRootElement = settingsRootElement;
		this.settingsRootElement.classList.add("dg-settings");
		this.settings = settings;
		this.saveSettings = debounce(saveSettings, 1000, true);
	}

	getIcon(name: string): Node {
		return getIcon(name) ?? document.createElement("span");
	}

	async initialize() {
		this.settingsRootElement.empty();

		this.settingsRootElement.createEl("h1", {
			text: "Digital Garden Bady Settings",
		});

		const githubSettings = this.settingsRootElement.createEl("div", {
			cls: "connection-status",
		});

		new GithubSettings(this, githubSettings);

		this.settingsRootElement
			.createEl("h3", { text: "Folder Mapping" })
			.prepend(this.getIcon("folder"));
		this.initializePublishFolderPathSetting();
		this.initializeNotePathBaseSetting();
		this.initializeGitHubBaseURLSetting();
	}

	private initializeGitHubBaseURLSetting() {
		new Setting(this.settingsRootElement)
			.setName("Base URL")
			.setDesc(
				`This is optional, but recommended. It is used for the "Copy Garden URL" command, generating a sitemap.xml for better SEO and an RSS feed located at /feed.xml. `,
			)
			.addText((text) =>
				text
					.setPlaceholder("https://my-garden.vercel.app")
					.setValue(this.settings.gardenBaseUrl)
					.onChange(async (value) => {
						this.settings.gardenBaseUrl = value;

						this.saveSettings();
					}),
			);
	}

	private initializePublishFolderPathSetting() {
		const allFilders = this.app.vault.getAllFolders();

		const allFildersMap = Object.fromEntries(
			allFilders.map((folder) => [folder.path + "/", folder.path + "/"]),
		);

		const options = {
			"": "",
			...allFildersMap,
		};

		new Setting(this.settingsRootElement)
			.setName("Publish Folder Path")
			.setDesc(`Notes in this folder will be published.`)
			.addDropdown((dropdown) => {
				dropdown
					.addOptions(options)
					.setValue(this.settings.publishFolderPath)
					.onChange(async (value) => {
						this.settings.publishFolderPath = value;

						this.saveSettings();
					});
			});
	}

	private initializeNotePathBaseSetting() {
		const desc = document.createDocumentFragment();

		desc.createEl("span", undefined, (span) => {
			span.innerText = "The base path for your notes";
		});

		new Setting(this.settingsRootElement)
			.setName("Note path base")
			.setDesc(desc)
			.addText((text) =>
				text
					.setPlaceholder("docs/")
					.setValue(this.settings.notePathBase)
					.onChange(async (value) => {
						this.settings.notePathBase = value;

						this.saveSettings();
					}),
			);
	}
}
