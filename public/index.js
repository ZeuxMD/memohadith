//TODO: add english translations
const hadithCollectionUrl = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions.min.json";
// List of the books I want
const arBookNames = new Map();
arBookNames.set("abudawud", "سنن أبي داوود");
arBookNames.set("bukhari", "صحيح البخاري");
arBookNames.set("ibnmajah", "سنن ابن ماجة");
arBookNames.set("malik", "موطأ مالك");
arBookNames.set("muslim", "صحيح مسلم");
arBookNames.set("nasai", "سنن النسائي");
arBookNames.set("nawawi", "الأربعون النووية");
arBookNames.set("tirmidhi", "جامع الترمذي");
const bookOptions = document.querySelector('.book-options');
const urls = await getUrls(hadithCollectionUrl);
createOptionsList(urls);
const hadithDisplay = document.getElementById("hadith");
const hadithContainer = document.querySelector(".hadith-container");
const nextHadithBtn = document.querySelector(".next-hadith");
const prevHadithBtn = document.querySelector(".prev-hadith");
const listBtn = document.querySelector(".list-btn");
const list = document.querySelector(".list");
const searchBtn = document.getElementById("search-btn");
const searchUI = document.querySelector(".search-ui");
const searchInput = searchUI?.querySelector("input");
const searchResults = searchUI?.querySelector(".search-results");
const resultsCount = document.querySelector(".result-count>span");
const listItems = document.querySelector(".list-items");
const toggleTashkilBtn = document.getElementById('toggleTashkil');
let userData = JSON.parse(localStorage.getItem('userData') ?? "{}");
const fragment_size = 100;
const hadithBooks = {};
let hadiths;
let currentTitles = [];
let currentTitleFragment = 0;
const observer = new IntersectionObserver(observerCallback, { root: listItems, threshold: 0.5 });
let tashkilOn;
let currentHadith;
let currentBook;
let visits;
// if there is no cached data, initialize to defaults
visits = (userData?.visits ?? 0) + 1;
currentHadith = userData?.currentHadith ?? 0;
currentBook = userData?.currentBook ?? "nawawi";
tashkilOn = userData?.tashkilOn ?? true;
const currentBookOption = bookOptions.querySelector(`[value=${currentBook}]`);
if (currentBookOption)
    currentBookOption.selected = true;
await updateHadiths(currentBook);
// ------------ functions ----------------
async function getUrls(collectionUrl) {
    const urls = {};
    if (!localStorage.getItem("urls")) {
        const collectionData = await getDatafromAPI(collectionUrl);
        for (let key in collectionData) {
            if (!arBookNames.get(key))
                continue;
            const collection = collectionData[key].collection;
            urls[key] = { ar: "", en: "" };
            urls[key].ar = collection[0].link.replace(".json", ".min.json");
            for (const c of collection) {
                if (c.language === "English")
                    urls[key].en = c.link.replace(".json", ".min.json");
            }
        }
        localStorage.setItem("urls", JSON.stringify(urls));
        return urls;
    }
    return JSON.parse(localStorage.getItem(("urls")) ?? "");
}
function createOptionsList(urls) {
    for (let bookName in urls) {
        const option = document.createElement("option");
        option.value = bookName;
        option.text = arBookNames.get(bookName);
        bookOptions?.appendChild(option);
    }
}
async function getDatafromAPI(url) {
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
async function getHadithDatafromAPI(hadithUrl) {
    return getDatafromAPI(hadithUrl)
        .then(hadithData => {
        // handle fetching before service worker is installed (i'll make it look better later.. i think)
        let hadithsTemp;
        if (hadithData.hadiths) {
            hadithsTemp = hadithData.hadiths.map((hadithInstance) => hadithInstance.text.replaceAll("<br>", ""));
        }
        return hadithsTemp ?? hadithData;
    });
}
function observerCallback(entries) {
    for (const entry of entries) {
        if (!entry.isIntersecting)
            continue;
        const target = entry.target;
        if (target.dataset.downSentry) {
            observer.unobserve(target);
            currentTitleFragment++;
            displayHadithTitles(currentTitleFragment);
            observeFirstLiSentry(listItems?.firstElementChild);
        }
        else if (target.dataset.upSentry && currentTitleFragment > 1) {
            observer.unobserve(target);
            removeLastLiFragment();
            currentTitleFragment--;
            const newTitles = currentTitles[currentTitleFragment - 1].cloneNode(true);
            listItems?.insertBefore(newTitles, listItems.firstElementChild);
            observeFirstLiSentry(listItems?.firstElementChild);
            observeLastLiSentry(listItems?.lastElementChild);
        }
    }
}
async function updateHadiths(currentBook) {
    // The browser loads all hadithBooks when Idle, now when you want a hadith array it's just there, no need to fetch everytime from api or indexedDB even!
    // If it didn't load hadithBooks yet, then it is probably the first load.
    hadiths = hadithBooks[currentBook] ?? await getHadithDatafromAPI(urls[currentBook].ar);
    ;
    currentTitles = [];
    displayHadith();
    processTitlesChunked(fragment_size);
}
function processTitlesChunked(chunkSize) {
    listItems?.replaceChildren();
    let index = 0;
    function processNextChunk() {
        if (index >= hadiths.length) {
            return;
        }
        currentTitles.push(createHadithTitles(index, chunkSize));
        if (currentHadith >= index && currentHadith <= index + chunkSize) {
            currentTitleFragment = getCurrentTitleFragment();
            displayHadithTitles(currentTitleFragment);
            observeFirstLiSentry(listItems?.firstElementChild);
        }
        index += chunkSize;
        setTimeout(processNextChunk, 0);
    }
    processNextChunk();
}
function createHadithTitles(chunkIndex, chunkSize) {
    // Batch DOM updates
    const fragment = document.createDocumentFragment();
    const chunkEnd = Math.min(chunkIndex + chunkSize, hadiths.length);
    for (let i = chunkIndex; i < chunkEnd; i++) {
        const hadith = hadiths[i];
        let start = hadith.indexOf("\"") + 1 || hadith.indexOf(":") + 1 || hadith.indexOf("سلم ") + 3;
        const title = removeTashkeel(hadith.slice(start, start + 40).split(" ").splice(0, 4).join(" "));
        const newTitle = document.createElement('li');
        newTitle.className = 'list-item';
        newTitle.innerText = (i + 1) + ". " + title + "..";
        newTitle.dataset.index = i + "";
        fragment.appendChild(newTitle);
    }
    return fragment;
}
function displayHadithTitles(titlesFragmentIndex) {
    if (titlesFragmentIndex >= currentTitles.length)
        return;
    const titles = currentTitles[titlesFragmentIndex].cloneNode(true);
    observeLastLiSentry(titles);
    if (listItems?.childElementCount >= 200)
        removeFirstLiFragment();
    listItems?.appendChild(titles);
}
function displayHadith() {
    const hadithToDisplay = tashkilOn ? hadiths[currentHadith] : removeTashkeel(hadiths[currentHadith]);
    hadithDisplay.textContent = `${currentHadith + 1}- ${hadithToDisplay}`;
    hadithContainer.scrollTo({
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
    if (currentHadith == hadiths.length)
        currentHadith = 0;
    displayHadith();
}
function prevHadith() {
    currentHadith--;
    if (currentHadith < 0)
        currentHadith = hadiths.length - 1;
    displayHadith();
}
function setHadith(newValue) {
    currentHadith = parseInt(newValue);
}
// ----------------- Helper Functions ------------------
function getCurrentTitleFragment() {
    return Math.floor(currentHadith / fragment_size);
}
function clearTimeouts(ids) {
    for (const id of ids) {
        clearTimeout(id);
    }
}
function observeLiSentries(fragment) {
    observeFirstLiSentry(fragment);
    observeLastLiSentry(fragment);
}
function observeFirstLiSentry(fragment) {
    const firstLiElement = (fragment instanceof DocumentFragment ? fragment.firstElementChild : fragment);
    firstLiElement.dataset.upSentry = "1";
    observer.observe(firstLiElement);
}
function observeLastLiSentry(fragment) {
    const lastLiElement = (fragment instanceof DocumentFragment ? fragment.lastElementChild : fragment);
    lastLiElement.dataset.downSentry = "1";
    observer.observe(lastLiElement);
}
function removeFirstLiFragment() {
    removeLiFragment(0);
}
function removeLastLiFragment() {
    removeLiFragment(1);
}
function removeLiFragment(fragmentIndex) {
    const allLis = listItems?.querySelectorAll('li');
    const start = fragmentIndex * 100;
    const end = start + 100;
    for (let i = start; i < end && allLis[i]; i++) {
        allLis[i].remove();
    }
}
function removeTashkeel(text) {
    const tashkeelRegex = /[\u0617-\u061A\u064B-\u0652]/g;
    return text.replace(tashkeelRegex, '');
}
function removeTashkeelAndHamza(text) {
    const alifRegex = /[\u0623\u0625]/g;
    return removeTashkeel(text).replace(alifRegex, '\u0627');
}
// ------------ Event listeners ----------------
nextHadithBtn?.addEventListener('click', function () {
    nextHadith();
});
prevHadithBtn?.addEventListener('click', function () {
    prevHadith();
});
const maxSwipeTime = 500;
const minSwipeDistance = 50;
let pointerstartX = 0;
let pointerendX = 0;
let startTime = 0;
function checkSwipeDirection(rCallback, lCallback) {
    const distance = Math.abs(pointerendX - pointerstartX);
    const timeTaken = Date.now() - startTime;
    if (distance < minSwipeDistance || timeTaken > maxSwipeTime)
        return;
    if (pointerendX < pointerstartX) {
        lCallback();
    }
    else if (pointerendX > pointerstartX) {
        rCallback();
    }
}
document.addEventListener('touchstart', function (e) {
    pointerstartX = e.changedTouches[0].screenX;
    startTime = Date.now();
});
document.addEventListener('touchend', function (e) {
    pointerendX = e.changedTouches[0].screenX;
    function handleRightSwipe() {
        list?.classList.remove("active");
    }
    if (!list?.classList.contains("active")) {
        // list not active, navigate hadith
        checkSwipeDirection(nextHadith, prevHadith);
    }
    else
        // list active, close list on right swipe, do nothing on left swipe
        checkSwipeDirection(handleRightSwipe, () => { });
});
const handleClickOutsideList = function (e) {
    const target = e.target;
    if (!list?.contains(target)) {
        list?.classList.remove('active');
        document.removeEventListener('click', handleClickOutsideList);
    }
};
listBtn?.addEventListener('click', function (e) {
    e.stopPropagation();
    list?.classList.toggle('active');
    document.addEventListener('click', handleClickOutsideList);
});
list?.addEventListener('click', function (e) {
    const target = e.target;
    if (target?.dataset.index) {
        setHadith(target.dataset.index);
        displayHadith();
        list?.classList.remove('active');
    }
});
toggleTashkilBtn?.addEventListener("change", function () {
    tashkilOn = !tashkilOn;
    displayHadith();
});
bookOptions?.addEventListener("change", async function (e) {
    const target = e.target;
    currentBook = target.value;
    currentHadith = 0;
    await updateHadiths(currentBook);
});
const handleCloseSearch = function (e) {
    const target = e.target;
    // clicked on a result from the search
    searchResults?.scrollTo({
        top: 0,
    });
    if (searchResults?.contains(target) || target.classList.contains("close-search")) {
        searchUI?.classList.add('hidden');
        searchResults?.replaceChildren();
        hadithsNoTashkil = [];
        resultsCount.innerText = "";
        if (searchInput)
            searchInput.value = "";
        document.removeEventListener('click', handleCloseSearch);
    }
};
let hadithsNoTashkil;
function extractHadithNoTashkil(hadiths) {
    let result = [];
    for (const hadith of hadiths) {
        result.push(removeTashkeelAndHamza(hadith));
    }
    return result;
}
const searchFragmentSize = 50;
let searchResultsFragments = [];
searchBtn?.addEventListener("click", function (e) {
    e.stopPropagation();
    searchUI?.classList.remove("hidden");
    list?.classList.remove("active");
    searchInput?.focus();
    searchResultsFragments = [];
    setTimeout(() => {
        hadithsNoTashkil = extractHadithNoTashkil(hadiths);
    }, 0);
    document.addEventListener('click', handleCloseSearch);
});
let timeoutIds = [];
searchInput?.addEventListener("input", function (e) {
    const target = e.target;
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
        searchResults?.replaceChildren();
        return;
    }
    const numberQuery = parseInt(query);
    if (numberQuery && hadithsNoTashkil[numberQuery]) {
        const result = document.createElement("li");
        result.className = "result-item";
        result.innerText = `${numberQuery}- ${hadithsNoTashkil[numberQuery]}`;
        result.dataset.book = currentBook;
        result.dataset.index = (numberQuery - 1) + "";
        searchResults?.replaceChildren(result);
        resultsCount.innerText = 1 + "";
        return;
    }
    searchResultsFragments = [];
    processSearchChunked();
    const firstChunk = searchResultsFragments[0].cloneNode(true);
    searchResults?.appendChild(firstChunk);
    function processSearchChunked() {
        searchResults?.replaceChildren();
        let index = 0;
        let resultCount = 0;
        function createResultsFragment(chunkSize) {
            const fragment = document.createDocumentFragment();
            let resultsFound = 0;
            while (resultsFound < chunkSize && index < hadithsNoTashkil.length) {
                const hadith = hadithsNoTashkil[index];
                if (hadith.includes(query)) {
                    resultsFound++;
                    resultCount++;
                    const newResult = document.createElement('li');
                    newResult.className = 'result-item';
                    newResult.innerText = `${index + 1}- ${hadith}`;
                    newResult.dataset.book = currentBook;
                    newResult.dataset.index = index + "";
                    fragment.appendChild(newResult);
                }
                index++;
            }
            return fragment;
        }
        function processNextChunk() {
            if (index >= hadithsNoTashkil.length) {
                resultsCount.innerText = (resultCount || "") + "";
                return;
            }
            searchResultsFragments.push(createResultsFragment(searchFragmentSize));
            timeoutIds.push(setTimeout(processNextChunk, 0));
        }
        processNextChunk();
    }
});
searchResults?.addEventListener("click", function (e) {
    const target = e.target;
    if (!target.dataset)
        return;
    const targetIndex = target.dataset.index;
    const targetBook = target.dataset.book;
    if (!targetIndex || !targetBook)
        return;
    currentHadith = parseInt(targetIndex);
    if (targetBook !== currentBook) {
        currentBook = targetBook;
        updateHadiths(currentBook);
    }
    else {
        displayHadith();
        currentTitleFragment = getCurrentTitleFragment();
        const titles = currentTitles[currentTitleFragment].cloneNode(true);
        observeLiSentries(titles);
        listItems?.replaceChildren(titles);
    }
});
// PWA installation prompt
let deferredPrompt;
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
    if (!deferredPrompt)
        return;
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
    for (const bookName in urls) {
        getHadithDatafromAPI(urls[bookName].ar)
            .then(response => {
            hadithBooks[bookName] = response;
        })
            .catch(error => console.log("error: ", error));
    }
});
export {};
