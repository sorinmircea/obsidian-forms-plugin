import { App, Modal, Notice, Plugin, Setting } from "obsidian";
import FormData from "types/FormData";
import ContentManager from "managers/ContentManager";
import APIManager from "managers/APIManager";

export default class FormManagementModal extends Modal {
	currentFolder: string;
	allFolders: string[];
	plugin: Plugin;

	contentManager: ContentManager;
	apiManager: APIManager;

	constructor(app: App, plugin: Plugin, apiManager: APIManager) {
		super(app);
		this.plugin = plugin;
		this.contentManager = new ContentManager(app);
		this.apiManager = apiManager;

		const activeFile = this.app.workspace.getActiveFile();
		this.allFolders = this.contentManager.getAllFolders();

		if (activeFile) {
			const filePath = activeFile.path;
			this.currentFolder = filePath.substring(
				0,
				filePath.lastIndexOf("/")
			);
		} else {
			this.currentFolder = "No active folder";
		}
	}

	async saveForms() {
		const data: Record<string, FormData> = {};
		this.apiManager.localForms.forEach((formData, key) => {
			data[key] = {
				mount_dir: formData.mount_dir,
				public_url: formData.public_url,
				edit_url: formData.edit_url,
				api_url: formData.api_url,
				management_secret: formData.management_secret,
			};
		});
		await this.plugin.saveData(data);
	}

	async onOpen() {
		await this.apiManager.refreshForms();

		const { contentEl } = this;
		contentEl.empty(); // Clear the modal content to ensure updates are reflected

		// Modal title
		contentEl.createEl("h3", { text: "New form" });

		// Add button to sync the currently selected folder
		new Setting(contentEl)
			.setName("Folder path")
			.setDesc(
				"Mark folder where form entries are going to be synced to."
			)
			.addDropdown((dropdown) => {
				this.allFolders.forEach((folder) => {
					dropdown.addOption(folder, folder);
				});
				dropdown
					.setValue(this.currentFolder) // Pre-populate with the current folder
					.onChange((value) => {
						this.currentFolder = value;
					});
			})
			.addButton((button) => {
				button
					.setButtonText("Select folder")
					.setCta()
					.onClick(() => this.handleFolderSelection(this.currentFolder));
			});

		// Container for "Forms" title and description
		const formsHeaderContainer = contentEl.createDiv();
		formsHeaderContainer.createEl("h3", { text: "Forms" });
		formsHeaderContainer.createEl("p", {
			text: "'Configure' to design form fields and deploy online. Form entries are auto-sync hourly, or manually via refresh button / 'Sync forms' action.",
			cls: "setting-item-description",
		});

		Array.from(this.apiManager.localForms.entries()).forEach(([folder, formData]) => {
			const folderSetting = new Setting(contentEl).setName(folder);

			folderSetting
				.addButton((button) => {
					button
						.setButtonText("Configure")
						.setCta()
						.setTooltip("Configure form questions")
						.onClick(() => {
							new Notice(`Configuring sync for ${folder}`);
							window.open(
								`${formData.edit_url}?secret=${formData.management_secret}`,
								"_blank"
							);
						});
				})
				.addButton((button) => {
					button
						.setIcon("sync")
						.setCta()
						.setTooltip("Fetch filled forms")
						.onClick(() => {
							this.apiManager.fetchFormData().then(() => {
								new Notice(`Forms successfully synced`);
							});
						});
				})
				.addButton((button) => {
					button
						.setIcon("cross")
						.setWarning()
						.onClick(() => {
							this.apiManager.localForms.delete(folder);
							this.saveForms();
							new Notice(`${folder} unlinked`);
							this.onOpen(); // Refresh the modal
						});
				});
		});
	}

	async handleFolderSelection(folderPath: string) {
		if (!this.apiManager.localForms.has(folderPath)) {
			new Notice(`Linking folder...`);

			// Call Server
			const serverResponse =
				await this.apiManager.createForm(
					this.app.vault.getName(),
					folderPath
				);

			// Save locally
			if (serverResponse) {
				this.apiManager.localForms.set(
					folderPath,
					new FormData(
						folderPath,
						serverResponse.public_url,
						serverResponse.edit_url,
						serverResponse.api_url,
						serverResponse.management_secret
					)
				);
				this.saveForms();
				await this.apiManager.refreshForms();
				new Notice(
					`${folderPath} marked as a form server`
				);
			} else {
				new Notice(`Failed connecting to the server`);
			}

			this.onOpen(); // Refresh to update the synced folders list
		} else {
			new Notice(
				`${folderPath} is already added`
			);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
