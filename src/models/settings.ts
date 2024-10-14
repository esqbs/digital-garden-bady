import { ILogLevel } from "js-logger";

/** Saved to data.json, changing requires a migration */
export default interface DigitalGardenSettings {
	githubToken: string;
	githubRepo: string;
	githubUserName: string;
	gardenBaseUrl: string;
	notePathBase: string;
	publishFolderPath: string;

	ENABLE_DEVELOPER_TOOLS?: boolean;
	devPluginPath?: string;
	logLevel?: ILogLevel;
}
