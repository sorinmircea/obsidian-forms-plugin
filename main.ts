import FormManagementModal from "ui/FormManagementModal";
import { Notice, Plugin, TFolder } from "obsidian";
import APIManager from "managers/APIManager";

export default class Forms extends Plugin {
	apiManager: APIManager;

	async onload() {
		this.apiManager = new APIManager(this);
		await this.apiManager.refreshForms();

		// Add ribbon icon
		this.addRibbonIcon("book-copy", "Forms dashboard", () => {
			new FormManagementModal(this.app, this, this.apiManager).open();
		});

		// Add shortcut to trigger resync
		this.addCommand({
			id: "sync-forms",
			name: "Sync forms",
			callback: () => {
				this.apiManager.fetchFormData().then(() => {
					new Notice(`Forms successfully synced`);
				});
			},
		});

		// Add shortcut to open the form dashboard
		this.addCommand({
			id: "forms-dashboard",
			name: "Open forms dashboard",
			callback: () => {
				new FormManagementModal(this.app, this, this.apiManager).open();
			},
		});

		// Add context menu option for folders
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFolder) {
					const isFormFolder = this.apiManager.localForms.has(file.path);

					if (!isFormFolder) {
						menu.addItem((item) => {
							item
								.setTitle("Create form in folder")
								.onClick(() => {
									const modal = new FormManagementModal(this.app, this, this.apiManager);
									modal.currentFolder = file.path;
									modal.handleFolderSelection(file.path);
									modal.open();
								});
						});
					}

					if (isFormFolder) {
						menu.addItem((item) => {
							item
								.setTitle("Sync form responses")
								.onClick(() => {
									this.apiManager.fetchFormData().then(() => {
										new Notice(`Form successfully synced`);
									});
								});
						});
					}
				}
			})
		);

		// Silently sync with forms.ifnul.com server once per hour
		this.registerInterval(
			window.setInterval(() => {
				this.apiManager.fetchFormData().then(() => { });
			}, 60 * 60 * 1000)
		);
	}

	onunload() { }
}
