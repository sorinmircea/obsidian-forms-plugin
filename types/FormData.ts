export default class FormData {
	mount_dir: string;
	public_url: string;
	edit_url: string;
	api_url: string;
	management_secret: string;

	constructor(
		mount_dir: string,
		public_url: string,
		edit_url: string,
		api_url: string,
		management_secret: string
	) {
		this.mount_dir = mount_dir;
		this.public_url = public_url;
		this.edit_url = edit_url;
		this.api_url = api_url;
		this.management_secret = management_secret;
	}
}
