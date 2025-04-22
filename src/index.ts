//TODO: add english translations
const newUrl = "https://cdn.jsdelivr.net/gh/ZeuxMD/hadith-books@latest/bookUrls.json"
const booksData: BookData[] = await getDatafromAPI(newUrl)
const bookOptions = document.querySelector('.book-options') as HTMLSelectElement;
createOptionsList(booksData);

const hadithDisplay = document.getElementById("hadith")
const hadithContainer = document.querySelector(".hadith-container")
const nextHadithBtn = document.querySelector(".next-hadith")
const prevHadithBtn = document.querySelector(".prev-hadith")
const listBtn = document.querySelector(".list-btn")
const list = document.querySelector(".list")
const searchBtn = document.getElementById("search-btn")
const searchUI = document.querySelector(".search-ui")
const searchInput = searchUI?.querySelector("input")
const searchResults = searchUI?.querySelector(".search-results")
const resultsCount = document.querySelector(".result-count>span") as HTMLSpanElement;
const toggleTashkilBtn = document.getElementById('toggleTashkil');

let userData = JSON.parse(localStorage.getItem('userData') ?? "{}");

const hadithBooks: { [key: string]: string[] } = {}
let hadiths: string[];
const clusterize = new Clusterize({
	rows: [],
	scrollId: 'scrollArea',
	contentId: 'contentArea',
	rows_in_block: 20,
	blocks_in_cluster: 4,

});
const clusterizeResults = new Clusterize({
	rows: [],
	scrollId: 'scrollAreaResults',
	contentId: 'contentAreaResults',
	show_no_data_row: false,
	rows_in_block: 20,
	blocks_in_cluster: 4,
	keep_parity: false,
});

let tashkilOn: boolean;
let currentHadith: number;
let currentBook: string;
let visits: number;
// if there is no cached data, initialize to defaults
visits = (userData?.visits ?? 0) + 1;
currentHadith = userData?.currentHadith ?? 0;
currentBook = userData?.currentBook ?? "nawawi40";
tashkilOn = userData?.tashkilOn ?? true;
const currentBookOption = bookOptions!.querySelector(`[value=${currentBook}]`) as HTMLOptionElement;
if (currentBookOption)
	currentBookOption.selected = true;

await updateHadiths(currentBook);
// ------------ functions ----------------

async function getUrls(collectionUrl: string) {
	const urls: { [key: string]: BookData["urls"] } = {};

	if (!localStorage.getItem("urls")) {
		const bookData: BookData[] = await getDatafromAPI(collectionUrl);
		for (const book of bookData) {
			urls[book.book] = book.urls;
		}
		localStorage.setItem("urls", JSON.stringify(urls))
		return urls;
	}

	return JSON.parse(localStorage.getItem(("urls")) ?? "");
}

function createOptionsList(urls: BookData[]) {
	for (let book of urls) {
		const option = document.createElement("option");
		option.value = book.book;
		option.text = book.arabicTitle;
		bookOptions?.appendChild(option);
	}
}

async function getDatafromAPI(url: string) {
	return fetch(url)
		.then(response => {
			if (!response.ok) {
				throw new Error(`Failed to fetch data. Status code: ${response.status}`);
			}
			return response.json();
		})
		.catch(error => {
			console.error("Error fetching data:", error);
		});
}

async function getHadithDatafromAPI(hadithUrl: string): Promise<string[]> {
	return getDatafromAPI(hadithUrl)
		.then(hadithData => {
			// handle fetching before service worker is installed (i'll make it look better later.. i think)
			let hadithsTemp;
			if (hadithData.chapters) {
				hadithsTemp = hadithData.chapters.flatMap((chapter: { hadiths: string[] }) => chapter.hadiths)
			}
			return hadithsTemp ?? hadithData;
		})
}


async function updateHadiths(currentBook: string) {
	// The browser loads all hadithBooks when Idle, now when you want a hadith array it's just there, no need to fetch everytime from api or indexedDB even!
	// If it didn't load hadithBooks yet, then it is probably the first load.
	hadiths = hadithBooks[currentBook] ?? await getHadithDatafromAPI(booksData.find(book => book.book == currentBook)?.urls.minified ?? "");;
	displayHadith();
	const chunkSize = 100;
	processTitlesChunked(chunkSize)
}

function processTitlesChunked(chunkSize: number) {
	let index = 0;
	function processNextChunk() {
		if (index >= hadiths.length) {
			return;
		}
		clusterize.append(createHadithTitles(index, chunkSize));
		if (currentHadith >= index && currentHadith <= index + chunkSize) {
			scrollToIndex(currentHadith);
		}
		index += chunkSize;
		setTimeout(processNextChunk, 0);
	}
	clusterize.clear();
	processNextChunk();
}

function createHadithTitles(chunkIndex: number, chunkSize: number) {
	const chunkEnd = Math.min(chunkIndex + chunkSize, hadiths.length);
	let newRows = [];
	for (let i = chunkIndex; i < chunkEnd; i++) {
		const hadith = hadiths[i];
		let start = hadith.indexOf("\"") + 1 || hadith.indexOf(":") + 1 || hadith.indexOf("سلم ") + 3;
		const title = removeTashkeel(hadith.slice(start, start + 40).split(" ").splice(0, 4).join(" "));
		newRows.push(`<li class="list-item" data-index="${i}">${i + 1}. ${title}..</li>`);
	}
	return newRows;
}

function displayHadith() {
	const hadithToDisplay = tashkilOn ? hadiths[currentHadith] : removeTashkeel(hadiths[currentHadith]);
	hadithDisplay!.textContent = `${currentHadith + 1}- ${hadithToDisplay}`;
	hadithContainer!.scrollTo({
		top: 0,
	});

	localStorage.setItem('userData', JSON.stringify({
		...userData,
		currentHadith: currentHadith,
		currentBook: currentBook,
		tashkilOn: tashkilOn,
	}));
}

function nextHadith() {
	currentHadith++;
	//TODO: add congratulations message if you finished a series of hadiths
	if (currentHadith == hadiths.length) currentHadith = 0;
	displayHadith();
}

function prevHadith() {
	currentHadith--;
	if (currentHadith < 0) currentHadith = hadiths.length - 1;
	displayHadith();
}

function setHadith(newValue: string) {
	currentHadith = parseInt(newValue);
}

// ----------------- Helper Functions ------------------
function clearTimeouts(ids: number[]) {
	for (const id of ids) {
		clearTimeout(id);
	}
}

function scrollToIndex(index: number) {
	const scrollContainer = document.getElementById('scrollArea');
	if (!scrollContainer) return;
	const sampleItem = scrollContainer.querySelector('li');
	const itemHeight = sampleItem ? sampleItem.offsetHeight : 30;
	scrollContainer.scrollTop = index * itemHeight;
}

function removeTashkeel(text: string) {
	const tashkeelRegex = /[\u0617-\u061A\u064B-\u0652]/g;
	return text.replace(tashkeelRegex, '');
}

function removeTashkeelAndHamza(text: string) {
	const alifRegex = /[\u0623\u0625]/g;
	return removeTashkeel(text).replace(alifRegex, '\u0627');
}

// ------------ Event listeners ----------------

nextHadithBtn?.addEventListener('click', function() {
	nextHadith();
})
prevHadithBtn?.addEventListener('click', function() {
	prevHadith();
});

const maxSwipeTime = 500;
const minSwipeDistance = 80;

let pointerstartX = 0;
let pointerendX = 0;
let startTime = 0;

function checkSwipeDirection(rCallback: CallableFunction, lCallback: CallableFunction) {
	const distance = Math.abs(pointerendX - pointerstartX);
	const timeTaken = Date.now() - startTime;

	if (distance < minSwipeDistance || timeTaken > maxSwipeTime) return;

	if (pointerendX < pointerstartX) {
		lCallback();
	} else if (pointerendX > pointerstartX) {
		rCallback();
	}
}


document.addEventListener('touchstart', function(e) {
	pointerstartX = e.changedTouches[0].screenX;
	startTime = Date.now();
})

document.addEventListener('touchend', function(e) {
	pointerendX = e.changedTouches[0].screenX;
	function handleRightSwipe() {
		list?.classList.remove("active");
	}

	if (!list?.classList.contains("active")) {
		// list not active, navigate hadith
		checkSwipeDirection(nextHadith, prevHadith);
	} else
		// list active, close list on right swipe, do nothing on left swipe
		checkSwipeDirection(handleRightSwipe, () => { });
})

const handleClickOutsideList = function(e: Event) {
	const target = e.target as Node;
	if (!list?.contains(target)) {
		list?.classList.remove('active');
		document.removeEventListener('click', handleClickOutsideList);
	}
};

listBtn?.addEventListener('click', function(e) {
	e.stopPropagation();
	list?.classList.toggle('active');
	document.addEventListener('click', handleClickOutsideList);
})

list?.addEventListener('click', function(e) {
	const target = e.target as HTMLElement;
	if (target?.dataset.index) {
		setHadith(target.dataset.index);
		displayHadith();
		list?.classList.remove('active');
	}
})

toggleTashkilBtn?.addEventListener("change", function() {
	tashkilOn = !tashkilOn;
	displayHadith();
})

bookOptions?.addEventListener("change", async function(e) {
	const target = e.target as HTMLOptionElement;
	currentBook = target.value;
	currentHadith = 0;
	await updateHadiths(currentBook);
})

const handleCloseSearch = function(e: Event) {
	const target = e.target as HTMLElement;
	// clicked on a result from the search
	searchResults?.scrollTo({
		top: 0,
	});
	if (searchResults?.contains(target) || target.classList.contains("close-search")) {
		searchUI?.classList.add('hidden');
		clusterizeResults.clear();
		resultsCount.innerText = "";

		if (searchInput)
			searchInput.value = "";
		document.removeEventListener('click', handleCloseSearch);
	}
};

let isGlobalSearch = false;

const searchScopeToggle = document.querySelector('.search-scope-toggle') as HTMLButtonElement;
const scopeText = searchScopeToggle?.querySelector('.scope-text') as HTMLSpanElement;

// Add the event listener
searchScopeToggle?.addEventListener('click', () => {
	isGlobalSearch = !isGlobalSearch;
	scopeText.textContent = isGlobalSearch ? 'بحث شامل' : 'الكتاب الحالي';
	searchInput?.focus();

	if (searchInput?.value.trim()) {
		// Trigger the search again
		searchInput.dispatchEvent(new Event('input'));
	}
});

searchBtn?.addEventListener("click", function(e) {
	e.stopPropagation();
	searchUI?.classList.remove("hidden");
	list?.classList.remove("active");
	searchInput?.focus();
	clusterizeResults.clear();
	document.addEventListener('click', handleCloseSearch);
})
// TODO: save isGlobalSearch as prefrence in localStorage

let timeoutIds: number[] = [];

searchInput?.addEventListener("input", function(e) {
	const target = e.target as HTMLInputElement;
	// clean the search query of any tashkil or hamza for consistency
	const query = removeTashkeelAndHamza(target.value);
	// clear search results from previous searches
	searchResults?.scrollTo({
		top: 0,
	});
	resultsCount.innerText = "";
	// clear timeouts from previous searches
	clearTimeouts(timeoutIds);
	timeoutIds = [];

	if (query.length == 0) {
		clusterizeResults.clear();
		return;
	}

	const numberQuery = parseInt(query);
	if (numberQuery && hadiths[numberQuery]) {
		resultsCount.innerText = 1 + "";
		clusterizeResults.update([`<li class="result-item" data-book="${currentBook}" data-index="${numberQuery - 1}">${numberQuery}- ${removeTashkeel(hadiths[numberQuery])}</li>`])
		return;
	}


	processSearchChunked();

	function processSearchChunked() {
		let resultCount = 0;
		const batchSize = 50;
		let index = 0;

		const booksToSearch = isGlobalSearch ? Object.keys(hadithBooks) : [currentBook];
		const totalHadithsCount = Object.values(booksToSearch).reduce((sum, book) => sum + hadithBooks[book].length, 0);
		let currentBookIndex = 0;
		let indexInBook = 0;
		let currentBookLength = hadithBooks[booksToSearch[currentBookIndex]].length

		function createResultsFragment(chunkSize: number) {
			let resultsFound = 0;
			let newRows = [];

			while (resultsFound < chunkSize && index < totalHadithsCount) {
				const hadith = hadithBooks[booksToSearch[currentBookIndex]][indexInBook];
				if (!hadith) {
					indexInBook++;
					index++;
					continue;
				}
				const searchableHadith = removeTashkeelAndHamza(hadith)
				if (searchableHadith.includes(query)) {
					resultsFound++;
					resultCount++;
					newRows.push(`<li class="result-item" data-book="${booksToSearch[currentBookIndex]}" data-index="${indexInBook}">${isGlobalSearch ? "" : (index + 1) + "-"} ${searchableHadith}</li>`)
				}
				indexInBook++;
				index++;

				if (indexInBook >= currentBookLength) {
					currentBookIndex++;
					indexInBook = 0;
					if (currentBookIndex < booksToSearch.length)
						currentBookLength = hadithBooks[booksToSearch[currentBookIndex]].length;
				}
			}


			return newRows;
		}

		function processNextBatch() {
			if (index >= totalHadithsCount) {
				resultsCount.innerText = (resultCount || "") + "";
				return;
			}

			clusterizeResults.append(createResultsFragment(batchSize));

			timeoutIds.push(setTimeout(processNextBatch, 0));
		}

		clusterizeResults.clear();
		processNextBatch();

	}
})

searchResults?.addEventListener("click", function(e) {
	const target = e.target as HTMLLIElement;
	if (!target.dataset) return
	const targetIndex = target.dataset.index;
	const targetBook = target.dataset.book;
	if (!targetIndex || !targetBook) return;

	currentHadith = parseInt(targetIndex);

	if (targetBook !== currentBook) {
		currentBook = targetBook;
		bookOptions.value = currentBook;
		updateHadiths(currentBook)
	}
	displayHadith();
	scrollToIndex(currentHadith);
})

// PWA installation prompt

let deferredPrompt: any;
const pwaPopup = document.getElementById("pwa-install");

window.addEventListener("beforeinstallprompt", (e) => {
	console.log("beforeinstallprompt");
	e.preventDefault();
	deferredPrompt = e;
	// Check if we should show the prompt
	const lastDeclined = localStorage.getItem('pwaDeclined');
	const now = Date.now();

	if (!lastDeclined || (now - parseInt(lastDeclined)) > (7 * 24 * 60 * 60 * 1000)) { // 7 days
		pwaPopup?.classList.remove('hidden');
	}
});

document.getElementById("accept-pwa")?.addEventListener('click', async () => {
	if (!deferredPrompt) return;

	deferredPrompt.prompt();
	const { outcome } = await deferredPrompt.userChoice;
	if (outcome === 'accepted') {
		pwaPopup?.classList.add('hidden');
		localStorage.removeItem('pwaDeclined'); // Clear declined state if installed
	}
	deferredPrompt = null;

});

document.getElementById("deny-pwa")?.addEventListener('click', () => {
	pwaPopup?.classList.add('hidden');
	localStorage.setItem('pwaDeclined', Date.now().toString());
});
// ------------ Standalone code ----------------

localStorage.setItem('userData', JSON.stringify({
	currentHadith: currentHadith,
	currentBook: currentBook,
	tashkilOn: tashkilOn,
	visits: visits,
}));

// Load all books when the browser is idle >:)
requestIdleCallback(() => {
	for (const book of booksData) {
		getHadithDatafromAPI(book.urls.minified)
			.then(response => {
				hadithBooks[book.book] = response;
			})
			.catch(error => console.log("error: ", error))
	}
})

export { }
