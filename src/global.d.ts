declare class Clusterize {
	constructor(options: {
		rows: string[];
		scrollId: string;
		contentId: string;
		tag?: string;
		no_data_text?: string;
		show_no_data_row?: boolean;
		rows_in_block?: number;           // Number of rows to render in each block
		blocks_in_cluster?: number;       // Number of blocks to keep in DOM
		callbacks?: {
			clusterWillChange?: () => void;
			clusterChanged?: () => void;
		};
	});

	update(rows: string[]): void;
	append(rows: string[]): void;
	prepend(rows: string[]): void;
	clear(): void;
	destroy(clean: boolean): void;
	refresh(force: boolean): void;
}
