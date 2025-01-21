import FormManagementModal from "ui/FormManagementModal";
import {
	Notice,
	Plugin,
} from "obsidian";
import APIManager from "managers/APIManager";

export default class Formsidian extends Plugin {
	apiManager: APIManager;

	async onload() {
		this.apiManager = new APIManager(this);

		// Add ribbon icon
		this.addRibbonIcon("book-copy", "Formsidian dashboard", () => {
			new FormManagementModal(this.app, this).open();
		});

		// Add shortcut to force resync
		this.addCommand({
			id: "sync-formsidian",
			name: "Sync forms",
			callback: () => {
				this.apiManager.fetchFormData().then(() => {
					new Notice(`Formsidian successfully synced`);
				});
			},
		});

		// Silently sync with formsidian server once per hour
		this.registerInterval(
			window.setInterval(() => {
				this.apiManager.fetchFormData().then(() => {});
			}, 60 * 60 * 1000)
		);
	}

	onunload() {}
}
