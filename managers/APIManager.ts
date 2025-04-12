import { FORMS_POST_ENDPOINT } from "../constants";
import { Notice, requestUrl, Plugin } from "obsidian";
import FormData from "../types/FormData";

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
	private formResponses: Record<string, APIManagerCreateFormRes>;
	public localForms: Map<string, FormData>;

	constructor(plugin: Plugin) {
		this.plugin = plugin;
		this.localForms = new Map();
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

			if (response.status < 200 || response.status >= 300) {
				const errorData = await response.json();
				new Notice(
					`Failed to create form: ${errorData.error || response.text
					}`
				);
				return;
			}

			const result = await response.json;
			return result;
		} catch (error) {
			new Notice("Failed to create form. Check console for details.");
			return;
		}
	}

	public async fetchFormData(): Promise<void> {
		// Load stored data which maps directory to the URL
		this.formResponses = await this.plugin.loadData();

		for (const key in this.formResponses) {
			const { mount_dir, api_url, management_secret } = this.formResponses[key];
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

		// If file exist just skip
		const responseExists = await this.plugin.app.vault.adapter.exists(fileName);
		if(responseExists) {
			return;
		}

		// Map values into YAML frontmatter and body
		const formEntries = response.values
			.map((v) => `${v.label}: "${v.content}"`)
			.join("\n");

		let submittedAt = new Date(response.submitted_at).toLocaleString(undefined, {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			timeZoneName: "short"
		});
		const submittedAtString = `submitted_at: "${submittedAt}"`;

		// Prepare the note content
		const noteContent = `---
${submittedAtString}
${formEntries}
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

	public isFormFolder(folderPath: string): boolean {
		return this.formResponses && this.formResponses[folderPath] !== undefined;
	}

	async loadForms(): Promise<Map<string, FormData>> {
		const forms = new Map<string, FormData>();
		const savedForms = (await this.plugin.loadData()) || {};
		
		for (const [key, value] of Object.entries(savedForms)) {
			const formValue = value as FormData;
			forms.set(
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
		
		return forms;
	}

	async refreshForms(): Promise<Map<string, FormData>> {
		this.localForms = await this.loadForms();
		return this.localForms;
	}
}
