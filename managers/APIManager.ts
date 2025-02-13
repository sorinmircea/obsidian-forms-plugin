import { FORMS_POST_ENDPOINT } from "../constants";
import { Notice, requestUrl, Plugin } from "obsidian";

interface APIManagerCreateFormRes {
	public_url: string;
	mount_dir: string;
	edit_url: string;
	api_url: string;
	management_secret: string;
}

interface Value {
	label: string;
	content: string;
}

interface ResponseItem {
	response_id: number;
	submitted_at: string;
	submitted_by: string | null;
	values: Value[];
}

export default class APIManager {
	private plugin: Plugin;
	private data: Record<string, APIManagerCreateFormRes>;

	constructor(plugin: Plugin) {
		this.plugin = plugin;
	}

	async createForm(
		vault_name: string,
		mount_dir: string
	): Promise<APIManagerCreateFormRes | undefined> {
		try {
			const response = await requestUrl({
				method: "POST",
				url: FORMS_POST_ENDPOINT,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ vault_name, mount_dir }),
			});
			
			if (response.status != 200) {
				const errorData = await response.json();
				new Notice(
					`Failed to create form: ${
						errorData.error || response.text
					}`
				);
				return;
			}

			const result = await response.json();
			return result;
		} catch (error) {
			new Notice("Failed to create form. Check console for details.");
			return;
		}
	}

	public async fetchFormData(): Promise<void> {
		// Load stored data which maps directory to the URL
		this.data = await this.plugin.loadData();

		for (const key in this.data) {
			const { mount_dir, api_url, management_secret } = this.data[key];
			const responses = await this.fetchResponses(
				api_url,
				management_secret
			);

			for (const responseItem of responses) {
				await this.createNoteFromResponse(mount_dir, responseItem);
			}
		}
	}

	private async fetchResponses(
		url: string,
		managementSecret: string
	): Promise<ResponseItem[]> {
		try {
			const response = await requestUrl({
				url,
				method: "GET",
				headers: {
					Authorization: `Bearer ${managementSecret}`,
				},
			});
			if (!response.json || !Array.isArray(response.json)) {
				return [];
			}
			return response.json as ResponseItem[];
		} catch (error) {
			return [];
		}
	}

	private async createNoteFromResponse(
		mountDir: string,
		response: ResponseItem
	): Promise<void> {
		// Construct a note filename based on the response (e.g., response_id)
		const fileNameBase = `response_${response.response_id}`;
		const fileName = `${mountDir}/${fileNameBase}.md`;

		// Map values into YAML frontmatter and body
		const frontmatterEntries = response.values
			.map((v) => `${v.label}: "${v.content}"`)
			.join("\n");
		const submittedAt = `submitted_at: "${response.submitted_at}"`;

		// Prepare the note content
		const noteContent = `---
${submittedAt}
${frontmatterEntries}
---
`;

		// Ensure the directory exists
		await this.ensureFolderExists(mountDir);

		// Create or overwrite the note file
		await this.plugin.app.vault.adapter.write(fileName, noteContent);
	}

	private async ensureFolderExists(folderPath: string) {
		const adapter = this.plugin.app.vault.adapter;
		const folderExists = await adapter.exists(folderPath);
		if (!folderExists) {
			await adapter.mkdir(folderPath);
		}
	}
}
