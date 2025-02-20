import { App, Modal, Notice, Plugin, Setting } from "obsidian";
import FormData from "types/FormData";
import ContentManager from "managers/ContentManager";
import APIManager from "managers/APIManager";

export default class FormManagementModal extends Modal {
	currentFolder: string;
	allFolders: string[];
	forms: Map<string, FormData>;
	plugin: Plugin;

	contentManager: ContentManager;
	apiManager: APIManager;

	constructor(app: App, plugin: Plugin) {
		super(app);
		this.plugin = plugin;
		this.contentManager = new ContentManager(app);
		this.apiManager = new APIManager(plugin);

		const activeFile = this.app.workspace.getActiveFile();
		this.allFolders = this.contentManager.getAllFolders();
		this.forms = new Map();

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

	async loadForms() {
		const savedForms = (await this.plugin.loadData()) || {};
		for (const [key, value] of Object.entries(savedForms)) {
			const formValue = value as FormData;
			this.forms.set(
				key,
				new FormData(
					formValue.mount_dir,
					formValue.public_url,
					formValue.edit_url,
					formValue.api_url,
					formValue.management_secret
				)
			);
		}
	}

	async saveForms() {
		const data: Record<string, FormData> = {};
		this.forms.forEach((formData, key) => {
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
		await this.loadForms();

		const { contentEl } = this;
		contentEl.empty(); // Clear the modal content to ensure updates are reflected

		// Modal title
		contentEl.createEl("h3", { text: "New form" });

		// Add button to sync the currently selected folder
		new Setting(contentEl)
			.setName("Folder path")
			.setDesc("Root folder for the form.")
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
					.setButtonText("Add folder")
					.setCta()
					.onClick(async () => {
						if (!this.forms.has(this.currentFolder)) {
							new Notice(`Linking folder...`);

							// Call Server
							const serverResponse =
								await this.apiManager.createForm(
									this.app.vault.getName(),
									this.currentFolder
								);

							// Save locally
							if (serverResponse) {
								this.forms.set(
									this.currentFolder,
									new FormData(
										this.currentFolder,
										serverResponse.public_url,
										serverResponse.edit_url,
										serverResponse.api_url,
										serverResponse.management_secret
									)
								);
								this.saveForms();
								new Notice(
									`${this.currentFolder} linked to Formsidian`
								);
							} else {
								new Notice(`Failed connecting to the server`);
							}

							this.onOpen(); // Refresh to update the synced folders list
						} else {
							new Notice(
								`${this.currentFolder} is already added`
							);
						}
					});
			});

		// List all synced folders with configure and delete options
		contentEl.createEl("br");
		contentEl.createEl("h3", { text: "Forms" });
		Array.from(this.forms.entries()).forEach(([folder, formData]) => {
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
								new Notice(`Formsidian successfully synced`);
							});
						});
				})
				.addButton((button) => {
					button
						.setIcon("cross")
						.setWarning()
						.onClick(() => {
							this.forms.delete(folder);
							this.saveForms();
							new Notice(`${folder} unlinked`);
							this.onOpen(); // Refresh the modal
						});
				});
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
