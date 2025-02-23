import FormManagementModal from "ui/FormManagementModal";
import {
	Notice,
	Plugin,
} from "obsidian";
import APIManager from "managers/APIManager";

export default class Forms extends Plugin {
	apiManager: APIManager;

	async onload() {
		this.apiManager = new APIManager(this);

		// Add ribbon icon
		this.addRibbonIcon("book-copy", "Forms dashboard", () => {
			new FormManagementModal(this.app, this).open();
		});

		// Add shortcut to force resync
		this.addCommand({
			id: "sync-forms",
			name: "Sync forms",
			callback: () => {
				this.apiManager.fetchFormData().then(() => {
					new Notice(`Forms successfully synced`);
				});
			},
		});

		// Silently sync with forms.ifnul.com server once per hour
		this.registerInterval(
			window.setInterval(() => {
				this.apiManager.fetchFormData().then(() => {});
			}, 60 * 60 * 1000)
		);
	}

	onunload() {}
}
