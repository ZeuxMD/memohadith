//TODO: add english translations
const hadithCollectionUrl = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions.json";
// List of the books I want
const arBookNames = new Map();
arBookNames.set("abudawud", "سنن أبي داوود")
arBookNames.set("bukhari", "صحيح البخاري")
arBookNames.set("ibnmajah", "سنن ابن ماجة")
arBookNames.set("malik", "موطأ مالك")
arBookNames.set("muslim", "صحيح مسلم")
arBookNames.set("nasai", "سنن النسائي")
arBookNames.set("nawawi", "الأربعون النووية")
arBookNames.set("tirmidhi", "جامع الترمذي")
const bookOptions = document.querySelector('.book-options');

const urls = await getUrls(hadithCollectionUrl);
createOptionsList(urls);

const hadithDisplay = document.getElementById("hadith")
const hadithContainer = document.querySelector(".hadith-container")
const nextHadithBtn = document.querySelector(".next-hadith")
const prevHadithBtn = document.querySelector(".prev-hadith")
const listBtn = document.querySelector(".list-btn")
const list = document.querySelector(".list")
const listItems = document.querySelector(".list-items")
//const testBtn = document.querySelector(".test-btn");
const testWindow = document.querySelector('.test-window');
const closeTest = document.querySelector('.close-test');
const questionContainer = document.querySelector('.question-container');
const checkAns = document.querySelector('.check-ans');
const answerContainer = document.querySelector('.ans-container');
const questionHeadEl = document.querySelector('.question-head');
const answerInput = document.querySelector('.answer-input');
const toggleTashkilBtn = document.getElementById('toggleTashkil');

let userData = JSON.parse(localStorage.getItem('userData'));
let state = { hadiths: null, hadithsNoTashkil: null, hadithTitles: null };

let tashkilOn;
let currentHadith;
let currentBook;
let visits;
let randTest;
let narrators;
let extractors;
let currentQuestion;
let testScore = 0;
let currAns;

// if there is no cached data, initialize to defaults
visits = (userData?.visits ?? 0) + 1;
currentHadith = userData?.currentHadith ?? 0;
currentBook = userData?.currentBook ?? "nawawi";
tashkilOn = userData?.tashkilOn ?? true;
bookOptions.querySelector(`[value=${currentBook}]`).selected = true;

await updateHadiths(currentBook, state);
// ------------ functions ----------------

async function getUrls(collectionUrl) {
    const urls = {};

    if (!localStorage.getItem("urls")) {
        const collectionData = await getDatafromAPI(collectionUrl);

        for (let key in collectionData) {
            if (!arBookNames.get(key)) continue;
            const collection = collectionData[key].collection;
            urls[key] = { ar: "", en: "" };
            urls[key].ar = collection[0].link;
            for (const c of collection) {
                if (c.language === "English") urls[key].en = c.link;
            }
        }
        localStorage.setItem("urls", JSON.stringify(urls))
        return urls;
    }

    return JSON.parse(localStorage.getItem(("urls")));
}

function createOptionsList(urls) {
    for (let bookName in urls) {
        const option = document.createElement("option");
        option.value = bookName;
        option.text = arBookNames.get(bookName);
        bookOptions.appendChild(option);
    }
}

async function updateHadiths(currentBook, state) {
    const jsonData = await getDatafromAPI(urls[currentBook].ar);
    // handle fetching before service worker is installed (i'll make it look better later.. i think)
    let hadiths;
    if (jsonData.hadiths) {
        hadiths = jsonData.hadiths.map(hadith => hadith.text.replaceAll("<br>", ""));
    }
    state.hadiths = hadiths ?? jsonData;
    state.hadithsNoTashkil = extractHadithNoTashkil(state.hadiths);
    displayHadithTitles(state.hadithsNoTashkil);
    displayHadith();
}

function extractHadithNoTashkil(hadithArr) {
    const hadithsNoTashkil = [];
    for (const hadithText of hadithArr) {
        hadithsNoTashkil.push(removeTashkeel(hadithText));
    }
    return hadithsNoTashkil;
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

function getArabicName(engName) {
    return arBookNames.get(engName);
}

function removeTashkeel(text) {
    const tashkeelRegex = /[\u0617-\u061A\u064B-\u0652]/g;
    return text.replace(tashkeelRegex, '');
}

function displayHadith() {
    const hadithsToDisplay = tashkilOn ? state.hadiths : state.hadithsNoTashkil;
    hadithDisplay.textContent = `${currentHadith + 1}- ${hadithsToDisplay[currentHadith]}`;
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

function pickHadith() {
    const rnd = Math.floor(Math.random() * state.hadiths.length);
    return state.hadiths[rnd];
}

function nextHadith() {
    currentHadith++;
    //TODO: add congratulations message if you finished a series of hadiths
    if (currentHadith == state.hadiths.length) currentHadith = 0;
    displayHadith();
}

function prevHadith() {
    currentHadith--;
    if (currentHadith < 0) currentHadith = state.hadiths.length - 1;
    displayHadith();
}

function setHadith(newValue) {
    currentHadith = parseInt(newValue);
}

function displayHadithTitles(hadiths) {
    const titles = [];
    for (const [i, h] of hadiths.entries()) {
        let start = h.indexOf("\"") + 1 || h.indexOf(":") + 1 || h.indexOf("سلم ") + 3;
        const title = h.slice(start, start + 20).split(" ").splice(0, 4).join(" ");
        const newTitle = document.createElement('li');
        newTitle.className = 'list-item';
        newTitle.innerText = (i + 1) + ". " + title + "..";
        newTitle.dataset.index = i;
        titles.push(newTitle);
    }
    listItems.replaceChildren(...titles);
}

function getNarrators(hadithArr) {
    const hadith = hadithArr ?? state.hadiths;
    const narrators = [];
    for (const h of hadith) {
        const narrator = getNarrator(h)[0];
        if (narrators.includes(narrator)) continue;
        narrators.push(narrator);
    }
    return narrators;
}
function getNarrator(hadith) {
    const end = hadith.indexOf("رضي ");
    return [hadith.slice(0, end), end];
}
//narrators = getNarrators();

function getExtractors() {
    const extractors = [];
    for (const h of state.hadiths) {
        const extractor = getExtractor(h)[0];
        if (extractors.includes(extractor)) continue;
        extractors.push(extractor);
    }
    return extractors;
}
function getExtractor(hadith) {
    const start = hadith.indexOf("» ");
    let end = -1;
    for (let i = start + 1; i < hadith.length; i++) {
        if (hadith.charAt(i) == '.') {
            end = i;
            break;
        }
    }
    return [hadith.slice(start + 1, end), start];
}
//extractors = getExtractors();

function getRandomizedTest(testLength) {
    const memorizedHadith = state.hadiths.slice(0, testLength)
    const randomizedTest = new Array(memorizedHadith.length);

    for (let i = 0; i < randomizedTest.length; i++) {
        let rnd = Math.floor(Math.random() * memorizedHadith.length);
        // search for an empty slot in the array to put the current hadiths
        while (randomizedTest[rnd]) {
            rnd = Math.floor(Math.random() * memorizedHadith.length);
        }
        randomizedTest[rnd] = memorizedHadith[i];
    }
    return randomizedTest;
}

function nextQuestion() {
    checkAnswer();
    currentQuestion++;
    checkAns.textContent = "السؤال التالي";
    if (currentQuestion == randTest.length - 1) {
        checkAns.textContent = "انهي الاختبار";
    } else if (currentQuestion == randTest.length) {
        currentQuestion = 0;
        console.log(testScore);
    }
    currAns = getQuestion(randTest[currentQuestion]);
}
function checkAnswer() {
    const textInput = answerInput.querySelector('input[type="text"]');
    if (textInput) {
        if (textInput.textContent == currAns) testScore++;
    } else {
        const checked = answerInput.querySelector('input[name="answer"]:checked').value;
        if (checked === currAns) {
            testScore++;
        }
    }
}
// TODO: add dificulty levels
function getQuestion(question) {
    // 0, 1: narrator question, 2, 3: extractor question, 4: complete Hadith 
    // this is done to reduce the chance of getting a 'complete Hadith' question
    if (typeof question != "string") return;
    let questionHead;
    let ans;
    const questionType = Math.floor(Math.random() * 5);
    switch (questionType) {
        case 0:
        case 1:
            const [narrator, startFrom] = getNarrator(question);
            questionContainer.textContent = "***" + question.slice(startFrom);
            questionHead = "من راوي الحديث؟";
            ans = narrator;
            displayMCQ(narrator, narrators);
            break;
        case 2:
        case 3:
            const [extractor, deleteFrom] = getExtractor(question);
            questionContainer.textContent = question.slice(0, deleteFrom + 1) + " ***";
            questionHead = "من مخرِّج الحديث؟";
            ans = extractor;
            displayMCQ(extractor, extractors);
            break;
        case 4:
            const hadithStart = question.indexOf("«");
            const hadithEnd = question.indexOf("»");
            const hadithText = question.substring(hadithStart, hadithEnd).split(" ");
            const cutLength = Math.ceil(Math.random() * 5);
            const cutFrom = Math.floor(Math.random() * hadithText.length - 1);
            ans = hadithText.splice(cutFrom, cutLength, "****").join(" ");
            question = question.slice(0, hadithStart) + hadithText.join(" ") + question.slice(hadithEnd, -1);
            questionContainer.textContent = question;
            questionHead = "أكمل الحديث";
            const ansInput = document.createElement('input');
            ansInput.type = "text";
            ansInput.className = "text-ans";
            answerInput.replaceChildren(ansInput);
            break;
    }
    questionHeadEl.textContent = questionHead;
    console.log(ans);
    return ans;
}
// 2 approaches, 1: build UI elements programmatically, 2: build them in the HTML and edit them from here, displaying/hiding them as needed (prefered)
function displayMCQ(ans, answersArr) {
    const answers = createMultipleChoice(ans, answersArr);
    const msqList = document.createElement('ul');
    msqList.className = "msq-list";
    for (const a of answers) {
        const msq = document.createElement('li');
        const choiceLabel = document.createElement('label');
        const choice = document.createElement('input');
        choice.type = "radio";
        choice.name = "answer";
        choice.value = a;
        choiceLabel.textContent = " " + a;
        msq.className = "msq-item";
        msq.appendChild(choice);
        msq.appendChild(choiceLabel);
        msqList.appendChild(msq);
    }
    answerInput.replaceChildren(msqList);
}

function createMultipleChoice(realAns, answersArr) {
    const answersLength = Math.min(answersArr.length, 4);
    const answers = new Array(answersLength);
    let randPos = Math.floor(Math.random() * answersLength);
    answers[randPos] = realAns;
    let randAns = answersArr[Math.floor(Math.random() * answersArr.length)];
    for (let i = 0; i < answersLength - 1; i++) {
        while (answers[randPos])
            randPos = Math.floor(Math.random() * answersLength);
        while (answers.includes(randAns))
            randAns = answersArr[Math.floor(Math.random() * answersArr.length)];
        answers[randPos] = randAns;
    }
    return answers;
}

// ------------ Event listeners ----------------
nextHadithBtn.addEventListener('click', function() {
    nextHadith();
})
prevHadithBtn.addEventListener('click', function() {
    prevHadith();
});

const handleClickOutsideList = function(e) {
    if (!list.contains(e.target)) {
        list.classList.remove('active');
        document.removeEventListener('click', handleClickOutsideList);
    }
};

listBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    list.classList.toggle('active');
    document.addEventListener('click', handleClickOutsideList);
})
// open Hadith list on pressing space bar
// document.addEventListener('keydown', function(e) {
//     if (e.code == "Space") list.classList.toggle('active');
//     document.addEventListener('click', handleClickOutsideList);
// })
list.addEventListener('click', function(e) {
    const target = e.target;
    if (target.dataset.index) {
        setHadith(target.dataset.index);
        displayHadith();
    }
})
//testBtn.addEventListener('click', function(e) {
//    e.stopPropagation();
//
//    testWindow.classList.add('active');
//    randTest = getRandomizedTest(currentHadith);
//    currentQuestion = 0;
//    if (randTest.length > 1){
//        currAns = getQuestion(randTest[0]);
//        testScore = 0;
//        currentQuestion = 0;
//        checkAns.style.visibility = "visible";
//    }
//    else {
//        questionContainer.textContent = "احفظ حديثين على الأقل ثم اختبر :)";
//        checkAns.style.visibility = "hidden";
//    }
//    const handleClickOutside = function(e) {
//        if (!testWindow.contains(e.target)) {
//            testWindow.classList.remove('active');
//            randTest = null;
//            document.removeEventListener('click', handleClickOutside);
//        }
//    };
//
//    document.addEventListener('click', handleClickOutside);
//})
checkAns.addEventListener('click', function() {
    nextQuestion();
});
closeTest.addEventListener('click', function() {
    testWindow.classList.remove('active');
    randTest = null;
})

toggleTashkilBtn.addEventListener("change", function() {
    tashkilOn = !tashkilOn;
    displayHadith();
})
bookOptions.addEventListener("change", async function(e) {
    currentBook = e.target.value;
    currentHadith = 0;
    await updateHadiths(currentBook, state);
})

// PWA installation prompt


let deferredPrompt;
const pwaPopup = document.getElementById("pwa-install");

window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    pwaPopup.classList.remove("hidden");
});

document.getElementById("accept-pwa").addEventListener("click", () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === "accepted") {
                console.log("PWA installed");
            }
            pwaPopup.classList.add("hidden");
            deferredPrompt = null;
        });
    }
});

document.getElementById("deny-pwa").addEventListener("click", () => {
    pwaPopup.classList.add("hidden");
});

// ------------ Standalone code ----------------

localStorage.setItem('userData', JSON.stringify({
    currentHadith: currentHadith,
    currentBook: currentBook,
    tashkilOn: tashkilOn,
    visits: visits,
}));
