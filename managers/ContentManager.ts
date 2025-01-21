import { App, TFile, Notice } from "obsidian";

export default class ContentManager {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Creates a new document at the specified path.
	 */
	async createDocument(path: string, content: string): Promise<void> {
		try {
			// Check if file already exists
			const existingFile = this.app.vault.getAbstractFileByPath(path);
			if (existingFile instanceof TFile) {
				new Notice(`A file already exists at ${path}`);
				return;
			}

			// Create the file with the  content
			await this.app.vault.create(path, content);
			new Notice(`Document created at ${path}`);
		} catch (error) {
			new Notice(
				"Failed to create  document."
			);
		}
	}

	getAllFolders(): string[] {
        const folders = new Set<string>();
		folders.add("/");
        this.app.vault.getAllFolders().forEach((folder) => {
            folders.add(folder.path);
        });
        return Array.from(folders).sort();
    }

	/**
	 * Generates  properties for the document.
	 */
	generateMockProperties(): string {
		const Data = {
			title: " Title",
			dateCreated: new Date().toISOString(),
			tags: ["", "example"],
			content: "This is a  document created by the FileManager.",
		};

		// Convert the  data to Markdown format
		return `---
		${Object.entries(Data)
			.map(([key, value]) => {
				if (Array.isArray(value)) {
					return `${key}: [${value.join(", ")}]`;
				}
				return `${key}: ${value}`;
			})
			.join("\n")}
---
${Data.content}`;
	}
}
