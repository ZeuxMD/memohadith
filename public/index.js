//TODO: add english translations
const urls = {}
const engUrls = {}
const hadithCollectionUrl = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions.json";
const hadithCollectionData = JSON.parse(localStorage.getItem('collectionData')) || await getDatafromAPI(hadithCollectionUrl);
console.log(hadithCollectionData);
const arBookNames = new Map();
arBookNames.set("abudawud", "سنن أبي داوود")
arBookNames.set("bukhari", "صحيح البخاري")
arBookNames.set("ibnmajah", "سنن ابن ماجة")
arBookNames.set("malik", "موطأ مالك")
arBookNames.set("muslim", "صحيح مسلم")
arBookNames.set("nasai", "سنن النسائي")
arBookNames.set("nawawi", "الأربعون النووية")
arBookNames.set("tirmidhi", "جامع الترمذي")
//TODO: delve into indexedDB and see if you can use that to improve performance
const hadithDisplay = document.getElementById("hadith")
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
const bookOptions = document.querySelector('.book-options');

let userData = JSON.parse(localStorage.getItem('userData'));
let currentBook = "nawawi";
let state = { hadiths: null, hadithsNoTashkil: null, hadithTitles: null };

let currentHadith;
let visits;
let randTest;
let narrators;
let extractors;
let currentQuestion;
let testScore = 0;
let currAns;

for (let key in hadithCollectionData) {
    const collection = hadithCollectionData[key].collection;
    urls[key] = collection[0].link;
    for (const c of collection) {
        if (c.language === "English") engUrls[key] = c.link;
    }
    if (!arBookNames.get(key)) continue;
    const option = document.createElement("option");
    option.value = key;
    option.text = arBookNames.get(key);
    bookOptions.appendChild(option);
}

visits = (userData?.visits ?? 0) + 1;
currentHadith = userData?.currentHadith ?? 0;
currentBook = userData?.currentBook ?? "nawawi";
bookOptions.querySelector(`[value=${currentBook}]`).selected = true;

await updateHadiths(currentBook, state);
// ------------ functions ----------------

async function updateHadiths(currentBook, state) {
    const result = await getHadithArrays(currentBook);
    state.hadiths = result[0];
    state.hadithsNoTashkil = result[1];
    displayHadithTitles();
    displayHadith();
}

async function getHadithArrays(currentBook) {
    return extractHadithFromData(await getDatafromAPI(urls[currentBook]));
}

function extractHadithFromData(data) {
    const hadithData = data?.hadiths;
    const hadithsArr = [];
    const hadithsNoTashkil = [];
    for (const h of hadithData) {
        const text = h.text.replaceAll("<br>", "");
        hadithsArr.push(text);
        hadithsNoTashkil.push(removeTashkeel(text));
    }
    return [hadithsArr, hadithsNoTashkil];
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
    const hadithsToDisplay = toggleTashkilBtn.checked ? state.hadithsNoTashkil : state.hadiths;
    hadithDisplay.textContent = `${currentHadith + 1}- ${hadithsToDisplay[currentHadith]}`;
    localStorage.setItem('userData', JSON.stringify({
        currentHadith: currentHadith,
        currentBook: currentBook,
        visits: visits,
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

    localStorage.setItem('userData', JSON.stringify({
        ...userData,
        currentHadith: currentHadith,
    }));
}

function prevHadith() {
    currentHadith--;
    if (currentHadith < 0) currentHadith = state.hadiths.length - 1;
    displayHadith();

    localStorage.setItem('userData', JSON.stringify({
        ...userData,
        currentHadith: currentHadith,
    }));
}

function setHadith(newValue) {
    currentHadith = parseInt(newValue);
}

function displayHadithTitles() {
    const titles = [];
    for (const [i, h] of state.hadithsNoTashkil.entries()) {
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
    let hadith = state.hadiths;
    if (arguments.length > 0) hadith = hadithArr;
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
narrators = getNarrators();

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
extractors = getExtractors();

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
prevHadithBtn.addEventListener('click', function () {
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
    displayHadith();
})
bookOptions.addEventListener("change", async function(e) {
    currentBook = e.target.value;
    console.log(currentBook);
    currentHadith = 0;
    await updateHadiths(currentBook, state);
})

// ------------ Standalone code ----------------

localStorage.setItem('userData', JSON.stringify({
    currentHadith: currentHadith,
    currentBook: currentBook,
    visits: visits,
}));
localStorage.setItem('collectionData', JSON.stringify(hadithCollectionData));
