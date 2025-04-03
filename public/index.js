const hadithCollectionUrl = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions.json";
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
const listItems = document.querySelector(".list-items");
const toggleTashkilBtn = document.getElementById('toggleTashkil');
let userData = JSON.parse(localStorage.getItem('userData') ?? "");
let hadiths;
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
            urls[key].ar = collection[0].link;
            for (const c of collection) {
                if (c.language === "English")
                    urls[key].en = c.link;
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
        .then(data => data)
        .catch(error => {
        console.error("Error fetching data:", error);
    });
}
async function updateHadiths(currentBook) {
    const jsonData = await getDatafromAPI(urls[currentBook].ar);
    // handle fetching before service worker is installed (i'll make it look better later.. i think)
    let hadithsTemp;
    if (jsonData.hadiths) {
        hadithsTemp = jsonData.hadiths.map((hadithInstance) => {
            const hadith = hadithInstance.text;
            let start = hadith.indexOf("\"") + 1 || hadith.indexOf(":") + 1 || hadith.indexOf("سلم ") + 3;
            const title = hadith.slice(start, start + 20).split(" ").splice(0, 4).join(" ");
            return {
                hadith: hadith.replaceAll("<br>", ""),
                title: title,
            };
        });
    }
    hadiths = hadiths ?? jsonData;
    displayHadith();
    //TODO: instead of computing all hadith titles on every request, just create the hadith titles on the first request and add it to the object and in the cache
    setTimeout(() => displayHadithTitles(hadiths), 0);
}
function displayHadithTitles(hadiths) {
    listItems?.replaceChildren();
    for (const [i, hadith] of hadiths.entries()) {
        const newTitle = document.createElement('li');
        newTitle.className = 'list-item';
        newTitle.innerText = (i + 1) + ". " + hadith.title + "..";
        newTitle.dataset.index = i + "";
        listItems?.appendChild(newTitle);
    }
}
function extractHadithNoTashkil(hadithArr) {
    const hadithsNoTashkil = [];
    for (const hadith of hadithArr) {
        hadithsNoTashkil.push(removeTashkeel(hadith.hadith));
    }
    return hadithsNoTashkil;
}
function removeTashkeel(text) {
    const tashkeelRegex = /[\u0617-\u061A\u064B-\u0652]/g;
    return text.replace(tashkeelRegex, '');
}
function displayHadith() {
    const currHadith = hadiths[currentHadith].hadith;
    const hadithToDisplay = tashkilOn ? currHadith : removeTashkeel(currHadith);
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
// ------------ Event listeners ----------------
nextHadithBtn?.addEventListener('click', function () {
    nextHadith();
});
prevHadithBtn?.addEventListener('click', function () {
    prevHadith();
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
// PWA installation prompt
let deferredPrompt;
const pwaPopup = document.getElementById("pwa-install");
const denyPwa = localStorage.getItem("deny-pwa");
if (denyPwa !== "true") {
    window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        deferredPrompt = event;
        pwaPopup?.classList.remove("hidden");
    });
}
document.getElementById("accept-pwa")?.addEventListener("click", () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === "accepted") {
                console.log("PWA installed");
            }
            pwaPopup?.classList.add("hidden");
            deferredPrompt = null;
        });
    }
});
document.getElementById("deny-pwa")?.addEventListener("click", () => {
    pwaPopup?.classList.add("hidden");
    localStorage.setItem("deny-pwa", "true");
});
// ------------ Standalone code ----------------
localStorage.setItem('userData', JSON.stringify({
    currentHadith: currentHadith,
    currentBook: currentBook,
    tashkilOn: tashkilOn,
    visits: visits,
}));
export {};
