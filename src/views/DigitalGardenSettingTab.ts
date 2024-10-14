import { PluginSettingTab, App } from "obsidian";
import DigitalGarden from "../../main";
import SettingView from "./SettingsView/SettingView";

export class DigitalGardenSettingTab extends PluginSettingTab {
	plugin: DigitalGarden;

	constructor(app: App, plugin: DigitalGarden) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async display(): Promise<void> {
		const { containerEl } = this;

		const settingView = new SettingView(
			this.app,
			containerEl,
			this.plugin.settings,
			async () => await this.plugin.saveData(this.plugin.settings),
		);
		await settingView.initialize();
	}
}
